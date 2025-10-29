import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { useAuth } from './AuthContext';
import { useRolePermissions } from '../utils/roles';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Plus, Eye, Trash2, Loader2, Search, List, Calendar as CalendarIconLucide } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';
import { CourierBottomSheet } from './CourierBottomSheet';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Navigation, 
  Phone, 
  MessageSquare, 
  Camera, 
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Package,
  Upload
} from 'lucide-react';
import { openInYandexMaps, makePhoneCall, sendSMS, getCurrentLocation } from '../utils/maps';
import { OfflineQueue } from '../utils/pwa';

interface Order {
  id: number;
  number: string;
  createdAt: string;
  status: string;
  customerName: string;
  customerPhone: string;
  platformId?: number;
  distribution?: string;
  total: number;
  paid: boolean;
  deliveryDate?: string;
  deliverySlot?: string;
  deliveryStatus?: string;
  address?: string;
  courierId?: number;
  courierName?: string;
  courierComment?: string;
  deliveredAt?: string;
  deliveredLat?: number;
  deliveredLng?: number;
  proofPhotoUrl?: string;
  recipientName?: string;
}

interface OrdersProps {
  onViewOrder?: (orderId: number) => void;
  onCreateOrder?: () => void;
  initialViewMode?: 'list' | 'calendar';
}

const queue = new OfflineQueue();

export function Orders({ onViewOrder, onCreateOrder, initialViewMode }: OrdersProps) {
  const { user } = useAuth();
  const permissions = useRolePermissions(user);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDistribution, setFilterDistribution] = useState<string>('all');
  
  // Courier mode states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [updating, setUpdating] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // View mode for courier: 'list' or 'calendar'
  const [courierViewMode, setCourierViewMode] = useState<'list' | 'calendar'>(() => {
    if (initialViewMode) return initialViewMode;
    // Try to load saved preference from localStorage (only for courier mode)
    if (permissions.isCourierMode) {
      const saved = localStorage.getItem('courierViewMode');
      if (saved === 'list' || saved === 'calendar') return saved;
    }
    return 'list';
  });
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Save view mode preference
  useEffect(() => {
    if (permissions.isCourierMode) {
      localStorage.setItem('courierViewMode', courierViewMode);
    }
  }, [courierViewMode, permissions.isCourierMode]);

  // Update view mode when initialViewMode changes
  useEffect(() => {
    if (initialViewMode) {
      setCourierViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  useEffect(() => {
    loadData();
    if (permissions.isCourierMode) {
      queue.init();
    }
  }, []);

  const loadData = async () => {
    try {
      const [ordersData, platformsData, usersData] = await Promise.all([
        apiCall('/orders'),
        permissions.isCourierMode ? Promise.resolve({ platforms: [] }) : apiCall('/platforms'),
        apiCall('/users'),
      ]);
      
      // Create users map for quick lookup
      const usersMap = new Map(usersData.users.map((u: any) => [u.id, u]));
      
      // Filter orders for courier mode and add courier names
      const ordersWithCourier = ordersData.orders.map((o: any) => ({
        ...o,
        courierName: o.courierId ? usersMap.get(o.courierId)?.name : null,
      }));
      
      // Курьер видит только свои заказы с датой доставки
      const filteredOrders = permissions.isCourierMode
        ? ordersWithCourier.filter((o: Order) => 
            o.courierId === user?.id && o.deliveryDate
          )
        : ordersWithCourier;
      
      setOrders(filteredOrders);
      setPlatforms(platformsData.platforms);
    } catch (error: any) {
      if (error.message.includes('Offline') && permissions.isCourierMode) {
        toast.error('Работаем в офлайн режиме');
      } else {
        toast.error('Ошибка загрузки: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот заказ? Это действие необратимо.')) return;

    try {
      await apiCall(`/orders/${id}`, { method: 'DELETE' });
      toast.success('Заказ удалён');
      loadData();
    } catch (error: any) {
      toast.error('Ошибка удаления: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      new: { variant: 'default', label: 'Новый', color: 'bg-blue-100 text-blue-800' },
      in_progress: { variant: 'secondary', label: 'В работе', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { variant: 'default', label: 'Подтверждён', color: 'bg-green-100 text-green-800' },
      picking: { variant: 'secondary', label: 'Комплектация', color: 'bg-purple-100 text-purple-800' },
      shipped: { variant: 'default', label: 'Отгружен', color: 'bg-indigo-100 text-indigo-800' },
      completed: { variant: 'outline', label: 'Завершён', color: 'bg-gray-100 text-gray-800' },
      cancelled: { variant: 'destructive', label: 'Отменён', color: 'bg-red-100 text-red-800' },
    };
    const config = variants[status] || { variant: 'outline', label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Courier mode handlers
  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setSheetOpen(true);
    setProofPhoto(order.proofPhotoUrl || null);
    setRecipientName(order.recipientName || '');
  };

  const handleNavigate = () => {
    if (!selectedOrder) return;
    openInYandexMaps(selectedOrder.address || '');
  };

  const handleCall = () => {
    if (!selectedOrder) return;
    makePhoneCall(selectedOrder.customerPhone);
  };

  const handleSendMessage = (template: string) => {
    if (!selectedOrder) return;
    sendSMS(selectedOrder.customerPhone, template);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder) return;

    if (newStatus === 'delivered' && (!proofPhoto || !recipientName)) {
      toast.error('Загрузите фото и укажите ФИО получателя');
      return;
    }

    try {
      setUpdating(true);

      let location = null;
      try {
        location = await getCurrentLocation();
      } catch (err) {
        console.warn('Could not get location:', err);
      }

      const payload = {
        deliveryStatus: newStatus,
        proofPhotoUrl: proofPhoto,
        recipientName: recipientName || undefined,
        deliveredAt: newStatus === 'delivered' ? new Date().toISOString() : undefined,
        deliveredLat: location?.latitude,
        deliveredLng: location?.longitude,
      };

      const operation = async () => {
        return await apiCall(`/orders/${selectedOrder.id}/delivery-status`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      };

      try {
        await operation();
        toast.success('Статус обновлён');
      } catch (error: any) {
        if (error.message.includes('Offline')) {
          await queue.add(operation);
          toast.success('Сохранено. Отправится когда появится сеть.');
        } else {
          throw error;
        }
      }

      loadData();
      setSheetOpen(false);
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      assigned: { label: 'Назначен', color: 'bg-gray-100 text-gray-700' },
      en_route: { label: 'В пути', color: 'bg-orange-100 text-orange-700' },
      delivered: { label: 'Доставлено', color: 'bg-green-100 text-green-700' },
      failed: { label: 'Не доставлено', color: 'bg-red-100 text-red-700' },
    };
    const config = variants[status] || variants.assigned;
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.address && order.address.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesDistribution = filterDistribution === 'all' || order.distribution === filterDistribution;
    
    return matchesSearch && matchesStatus && matchesDistribution;
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Empty state for courier mode
  if (permissions.isCourierMode && orders.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="max-w-md text-center">
          <Package className="h-20 w-20 mx-auto mb-6 text-gray-300" />
          <h2 className="text-2xl mb-3">Нет заказов</h2>
          <p className="text-gray-600 mb-6">
            У вас пока нет назначенных заказов на сегодня или завтра.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm">
            <div className="font-semibold text-blue-900 mb-2">
              📋 Как получить заказы:
            </div>
            <ul className="space-y-1 text-blue-800">
              <li>• Менеджер должен назначить вас на заказ</li>
              <li>• Статус заказа должен быть "Подтверждён" или выше</li>
              <li>• Дата доставки - сегодня или завтра</li>
            </ul>
          </div>
          
          <button
            onClick={loadData}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            style={{ minHeight: '44px' }}
          >
            Обновить
          </button>
        </div>
      </div>
    );
  }

  // Helper functions for calendar view
  const getWeekDates = (date: Date) => {
    const week = [];
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday

    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      week.push(current);
    }
    return week;
  };

  const getOrdersForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredOrders.filter(o => o.deliveryDate === dateStr);
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // COURIER MODE RENDER
  if (permissions.isCourierMode) {
    const groupedOrders = filteredOrders.reduce((acc: Record<string, Order[]>, order) => {
      const slot = order.deliverySlot || 'Без времени';
      if (!acc[slot]) acc[slot] = [];
      acc[slot].push(order);
      return acc;
    }, {});

    const weekDates = getWeekDates(selectedDate);

    return (
      <div className="pb-20 md:pb-8 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-20 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl">Мои доставки</h1>
            
            {/* View mode toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCourierViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  courierViewMode === 'list'
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <List className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCourierViewMode('calendar')}
                className={`p-2 rounded transition-colors ${
                  courierViewMode === 'calendar'
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <CalendarIconLucide className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <Input
            placeholder="Поиск по адресу, телефону..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* LIST VIEW */}
        {courierViewMode === 'list' && (
          <div className="p-4 space-y-6">
            {Object.keys(groupedOrders).length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>Нет заказов на доставку</p>
              </div>
            ) : (
              Object.entries(groupedOrders).map(([slot, slotOrders]) => (
                <div key={slot}>
                  <h3 className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {slot}
                  </h3>
                  <div className="space-y-3">
                    {slotOrders.map(order => (
                      <Card
                        key={order.id}
                        onClick={() => handleOpenOrder(order)}
                        className="cursor-pointer active:scale-[0.98] transition-transform"
                        style={{ minHeight: '44px' }}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{order.number}</CardTitle>
                              <p className="text-sm text-gray-600">{order.customerName}</p>
                            </div>
                            {getDeliveryStatusBadge(order.deliveryStatus || 'assigned')}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-700">{order.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">{order.customerPhone}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-gray-600">Сумма:</span>
                            <span>{order.total?.toFixed(2)} BYN</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CALENDAR VIEW */}
        {courierViewMode === 'calendar' && (
          <div className="p-4">
            {/* Calendar controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={goToPreviousWeek}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  ←
                </button>
                
                <button
                  onClick={goToToday}
                  className="px-4 py-2 hover:bg-gray-100 rounded transition-colors text-sm"
                  style={{ minHeight: '44px' }}
                >
                  Сегодня
                </button>
                
                <button
                  onClick={goToNextWeek}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  →
                </button>
              </div>
              
              <div className="text-center text-sm text-gray-600 mt-2">
                {weekDates[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} —{' '}
                {weekDates[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>

            {/* Calendar grid */}
            <div className="space-y-3 md:grid md:grid-cols-7 md:gap-3 md:space-y-0">
              {weekDates.map((date, index) => {
                const dayOrders = getOrdersForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
                const dayNumber = date.getDate();

                return (
                  <div key={index} className="flex flex-col">
                    <div className={`p-3 rounded-t-lg border-b-2 ${isToday ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex md:flex-col items-center md:text-center gap-3 md:gap-0">
                        <div className="text-xs uppercase text-gray-600">{dayName}</div>
                        <div className={`text-xl ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                          {dayNumber}
                        </div>
                        {dayOrders.length > 0 && (
                          <div className="text-xs text-gray-600 md:mt-1 ml-auto md:ml-0">
                            {dayOrders.length} {dayOrders.length === 1 ? 'заказ' : 'заказов'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 border border-t-0 rounded-b-lg p-2 bg-white md:min-h-[300px] space-y-2">
                      {dayOrders.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-4 hidden md:block">
                          Нет доставок
                        </div>
                      ) : (
                        dayOrders.map(order => (
                          <Card
                            key={order.id}
                            onClick={() => handleOpenOrder(order)}
                            className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-300 active:scale-[0.98]"
                          >
                            <CardContent className="space-y-2 pt-[12px] pr-[12px] pb-[24px] pl-[12px]">
                              {/* Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm truncate">{order.number}</div>
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    {getStatusBadge(order.status)}
                                    {getDeliveryStatusBadge(order.deliveryStatus || 'assigned')}
                                  </div>
                                </div>
                                {order.distribution && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                                    {order.distribution === 'minsk' ? 'Минск' : 
                                     order.distribution === 'shipping' ? 'Отправки' : 'Самовывоз'}
                                  </Badge>
                                )}
                              </div>

                              {/* Time */}
                              {order.deliverySlot && (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Clock className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                  <span className="text-gray-700 truncate">{order.deliverySlot}</span>
                                </div>
                              )}

                              {/* Customer */}
                              <div className="flex items-start gap-1.5 text-xs">
                                <Phone className="h-3 w-3 text-gray-500 flex-shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-gray-900 truncate">{order.customerName}</div>
                                  <div className="text-gray-600 text-[10px] truncate">{order.customerPhone}</div>
                                </div>
                              </div>

                              {/* Address */}
                              {order.address && (
                                <div className="flex items-start gap-1.5 text-xs">
                                  <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700 line-clamp-2 text-[11px]">{order.address}</span>
                                </div>
                              )}

                              {/* Footer */}
                              <div className="pt-2 border-t mt-2 flex items-center justify-between gap-2">
                                <div className="text-xs">
                                  <span className="text-gray-500">Сумма:</span>{' '}
                                  <span>{order.total?.toFixed(2) || 0} BYN</span>
                                </div>
                                {order.deliveryDate && (
                                  <div className="text-[10px] text-gray-500">
                                    {new Date(order.deliveryDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info banner if no orders this week */}
            {filteredOrders.length === 0 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-blue-600 mt-0.5">
                    <CalendarIconLucide className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-blue-900 mb-1">
                      📅 Нет заказов на эту неделю
                    </h3>
                    <p className="text-sm text-blue-800">
                      У вас пока нет назначенных доставок на эту неделю. Заказы появятся здесь, когда менеджер назначит вас курьером.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Courier Bottom Sheet */}
        {selectedOrder && (
          <CourierBottomSheet
            order={selectedOrder}
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            onNavigate={handleNavigate}
            onCall={handleCall}
            onSendMessage={handleSendMessage}
            onUpdateStatus={handleUpdateStatus}
            proofPhoto={proofPhoto}
            recipientName={recipientName}
            onRecipientNameChange={setRecipientName}
            onPhotoCapture={handlePhotoCapture}
            updating={updating}
            fileInputRef={fileInputRef}
            getDeliveryStatusBadge={getDeliveryStatusBadge}
          />
        )}
      </div>
    );
  }

  // STANDARD MODE RENDER
  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl mb-2">Заказы</h1>
          <p className="text-gray-600">Управление заказами и доставкой</p>
        </div>
        {permissions.canCreateOrder && (
          <Button onClick={onCreateOrder} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Создать заказ
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Поиск</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Номер, клиент, телефон..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Статус</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="new">Новый</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="confirmed">Подтверждён</SelectItem>
                <SelectItem value="picking">Комплектация</SelectItem>
                <SelectItem value="shipped">Отгружен</SelectItem>
                <SelectItem value="completed">Завершён</SelectItem>
                <SelectItem value="cancelled">Отменён</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Распределение</Label>
            <Select value={filterDistribution} onValueChange={setFilterDistribution}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="minsk">Минск</SelectItem>
                <SelectItem value="shipping">Отправки</SelectItem>
                <SelectItem value="pickup">Самовывоз</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>№</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Распределение</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Оплата</TableHead>
              <TableHead>Доставка</TableHead>
              <TableHead>Курьер</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-gray-500 py-8">
                  Нет заказов
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell onClick={() => onViewOrder?.(order.id)}>
                    {order.number}
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order.id)}>
                    {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order.id)}>
                    {order.customerName || '—'}
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order.id)}>
                    {order.customerPhone || '—'}
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order.id)}>
                    {order.distribution === 'minsk' && 'Минск'}
                    {order.distribution === 'shipping' && 'Отправки'}
                    {order.distribution === 'pickup' && 'Самовывоз'}
                    {!order.distribution && '—'}
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order.id)}>
                    {order.total?.toFixed(2) || '—'}
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order.id)}>
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order.id)}>
                    {order.paid ? (
                      <Badge variant="default">Оплачен</Badge>
                    ) : (
                      <Badge variant="secondary">Не оплачен</Badge>
                    )}
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order.id)}>
                    {order.deliveryDate ? (
                      <div>
                        <div>{new Date(order.deliveryDate).toLocaleDateString('ru-RU')}</div>
                        {order.deliverySlot && (
                          <div className="text-xs text-gray-600">{order.deliverySlot}</div>
                        )}
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order.id)}>
                    {order.courierName ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                        🚚 {order.courierName}
                      </span>
                    ) : (
                      order.deliveryDate && (
                        <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-600">
                          ⚠️ Не назначен
                        </span>
                      )
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewOrder?.(order.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(order.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
