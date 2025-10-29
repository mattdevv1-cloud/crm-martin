import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, Calendar as CalendarIcon, Phone, MapPin, Clock, Package, User, CreditCard, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';
import { useAuth } from './AuthContext';
import { useRolePermissions } from '../utils/roles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from './ui/drawer';
import { useIsMobile } from './ui/use-mobile';

interface Order {
  id: number;
  number: string;
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryDate: string;
  deliverySlot: string;
  distribution: string;
  status: string;
  total: number;
  courierId?: number;
  courierName?: string;
}

export function CalendarView() {
  const { user } = useAuth();
  const permissions = useRolePermissions(user);
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterDistribution, setFilterDistribution] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const [ordersData, usersData] = await Promise.all([
        apiCall('/orders'),
        apiCall('/users'),
      ]);
      
      const usersMap = new Map(usersData.users.map((u: any) => [u.id, u]));
      
      let ordersWithCourier = ordersData.orders
        .filter((o: Order) => o.deliveryDate)
        .map((o: any) => ({
          ...o,
          courierName: o.courierId ? usersMap.get(o.courierId)?.name : null,
        }));
      
      // Фильтруем заказы для курьера - показываем только его заказы
      if (permissions.isCourierMode && user) {
        ordersWithCourier = ordersWithCourier.filter((o: Order) => o.courierId === user.id);
      }
      
      setOrders(ordersWithCourier);
      setUsers(usersData.users);
    } catch (error: any) {
      toast.error('Ошибка загрузки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get unique dates from orders
  const dates = Array.from(
    new Set(orders.map(o => o.deliveryDate))
  ).sort();

  // Get current week dates (Monday to Saturday, 6 days)
  const getWeekDates = (date: Date) => {
    const week = [];
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday

    for (let i = 0; i < 6; i++) { // Changed from 7 to 6 (no Sunday)
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      week.push(current);
    }
    return week;
  };

  const weekDates = getWeekDates(selectedDate);

  const getOrdersForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return orders.filter(o => {
      const matchesDate = o.deliveryDate === dateStr;
      const matchesDistribution = filterDistribution === 'all' || o.distribution === filterDistribution;
      return matchesDate && matchesDistribution;
    });
  };

  const getDistributionLabel = (distribution: string) => {
    const labels: Record<string, string> = {
      minsk: 'Минск',
      shipping: 'Отправки',
      pickup: 'Самовывоз',
    };
    return labels[distribution] || distribution;
  };

  const getDistributionColor = (distribution: string) => {
    const colors: Record<string, string> = {
      minsk: 'bg-blue-100 text-blue-800',
      shipping: 'bg-purple-100 text-purple-800',
      pickup: 'bg-green-100 text-green-800',
    };
    return colors[distribution] || 'bg-gray-100 text-gray-800';
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

  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    try {
      const data = await apiCall(`/orders/${order.id}`);
      setOrderItems(data.items || []);
    } catch (error: any) {
      toast.error('Ошибка загрузки деталей: ' + error.message);
      setOrderItems([]);
    }
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setOrderItems([]);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'Новый',
      confirmed: 'Подтверждён',
      picking: 'Комплектуется',
      ready: 'Готов',
      shipped: 'В пути',
      completed: 'Завершён',
      cancelled: 'Отменён',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-blue-100 text-blue-800',
      picking: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-green-100 text-green-800',
      shipped: 'bg-purple-100 text-purple-800',
      completed: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatTimeSlot = (slot: string) => {
    if (!slot || slot === 'not_specified') return 'Не указано';
    const timeSlots: Record<string, string> = {
      '09:00-12:00': '09:00-12:00',
      '12:00-15:00': '12:00-15:00',
      '15:00-18:00': '15:00-18:00',
      '18:00-21:00': '18:00-21:00',
    };
    return timeSlots[slot] || slot;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8">
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl mb-2">
          {permissions.isCourierMode ? 'Мои доставки' : 'Календарь доставок'}
        </h1>
        <p className="text-gray-600">
          {permissions.isCourierMode 
            ? 'Ваши назначенные доставки (понедельник-суббота)' 
            : 'Планирование доставок (понедельник-суббота)'}
        </p>
      </div>

      {permissions.isCourierMode && orders.length === 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CalendarIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Пока нет назначенных доставок</h3>
              <p className="text-sm text-blue-800">
                Когда менеджер назначит вам заказы, они появятся здесь. 
                Вы сможете просмотреть маршруты и детали доставок в календаре.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Button onClick={goToPreviousWeek} variant="outline" size="sm">
              ←
            </Button>
            <Button onClick={goToToday} variant="outline" size="sm">
              Сегодня
            </Button>
            <Button onClick={goToNextWeek} variant="outline" size="sm">
              →
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
            <span className="text-sm md:text-base">
              {weekDates[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} —{' '}
              {weekDates[5].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {!permissions.isCourierMode && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterDistribution === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterDistribution('all')}
              >
                Все
              </Button>
              <Button
                variant={filterDistribution === 'minsk' ? 'default' : 'outline'}
                size="sm"
              onClick={() => setFilterDistribution('minsk')}
            >
              Минск
            </Button>
            <Button
              variant={filterDistribution === 'shipping' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterDistribution('shipping')}
            >
              Отправки
            </Button>
            <Button
              variant={filterDistribution === 'pickup' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterDistribution('pickup')}
            >
              Самовывоз
            </Button>
            </div>
          )}
        </div>
      </div>

      <div className={isMobile ? "space-y-4" : "grid grid-cols-6 gap-6"}>
        {weekDates.map((date, index) => {
          const dayOrders = getOrdersForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const dayName = date.toLocaleDateString('ru-RU', { weekday: 'long' });
          const dayNumber = date.getDate();
          const monthName = date.toLocaleDateString('ru-RU', { month: 'long' });

          // On mobile, skip days without orders
          if (isMobile && dayOrders.length === 0) return null;

          return (
            <div key={index} className="flex flex-col">
              <div className={`p-3 md:p-4 rounded-t-lg border-b-2 ${isToday ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'}`}>
                <div className={isMobile ? "flex items-center justify-between" : "flex flex-col items-center text-center"}>
                  <div className="flex items-center gap-2">
                    <div className={`${isMobile ? 'text-base' : 'text-xs uppercase'} ${isToday ? 'text-blue-700' : 'text-gray-600'}`}>
                      {isMobile ? dayName : dayName.slice(0, 3)}
                    </div>
                    {isMobile && (
                      <div className={`text-xl ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                        {dayNumber} {monthName}
                      </div>
                    )}
                  </div>
                  {!isMobile && (
                    <div className={`text-2xl mt-1 ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                      {dayNumber}
                    </div>
                  )}
                  {dayOrders.length > 0 && (
                    <div className={`${isMobile ? 'text-sm' : 'text-xs mt-1'} text-gray-600`}>
                      {dayOrders.length} {dayOrders.length === 1 ? 'заказ' : 'заказов'}
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex-1 border border-t-0 rounded-b-lg p-4 bg-white space-y-3 ${!isMobile && 'min-h-[500px]'}`}>
                {dayOrders.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-4">
                    Нет доставок
                  </div>
                ) : (
                  dayOrders.map(order => (
                    <Card 
                      key={order.id} 
                      className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-300"
                      onClick={() => openOrderDetails(order)}
                    >
                      <CardContent className="p-5 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm mb-1.5">{order.number}</div>
                            <Badge className={`text-xs px-2 py-0.5 ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="text-xs px-2 py-0.5 flex-shrink-0">
                            {getDistributionLabel(order.distribution)}
                          </Badge>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="text-gray-700">{formatTimeSlot(order.deliverySlot)}</span>
                        </div>

                        {/* Customer */}
                        <div className="flex items-start gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="text-gray-900">{order.customerName}</div>
                            <div className="text-gray-600 text-xs mt-0.5">{order.customerPhone}</div>
                          </div>
                        </div>

                        {/* Address */}
                        {order.address && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700 line-clamp-2">{order.address}</span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="pt-3 border-t mt-3 flex items-center justify-between gap-2">
                          <div className="text-sm">
                            <span className="text-gray-500">Сумма:</span>{' '}
                            <span>{order.total?.toFixed(2) || 0} BYN</span>
                          </div>
                          {order.courierName ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
                              <User className="h-3.5 w-3.5 text-green-700" />
                              <span className="text-xs text-green-700">{order.courierName}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200">
                              <span className="text-xs text-orange-700">Не назначен</span>
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

      {orders.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          Нет запланированных доставок
        </div>
      )}

      {/* Info Banner */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-blue-600 mt-0.5">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 mb-2">
              💡 Как назначить курьера на доставку
            </h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Откройте заказ (нажмите на номер в таблице "Заказы")</li>
              <li>2. Измените статус на <strong>"Подтверждён"</strong> или выше</li>
              <li>3. Укажите дату доставки (сегодня или завтра)</li>
              <li>4. Выберите временной интервал (например, 12:00-15:00)</li>
              <li>5. В поле <strong>"Курьер"</strong> выберите курьера из списка</li>
              <li>6. Добавьте комментарий для курьера (опционально)</li>
              <li>7. Нажмите <strong>"Сохранить"</strong></li>
            </ol>
            <p className="text-sm text-blue-700 mt-3">
              ✅ После этого заказ появится в календаре курьера и в его мобильном приложении
            </p>
          </div>
        </div>
      </div>

      {/* Order Details Modal/Drawer */}
      {selectedOrder && (
        <>
          {isMobile ? (
            <Drawer open={!!selectedOrder} onOpenChange={(open) => !open && closeOrderDetails()}>
              <DrawerContent>
                <DrawerHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <DrawerTitle>Заказ {selectedOrder.number}</DrawerTitle>
                    <DrawerClose asChild>
                      <Button variant="ghost" size="icon" onClick={closeOrderDetails}>
                        <X className="h-4 w-4" />
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerHeader>
                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                  {renderOrderDetails()}
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && closeOrderDetails()}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Заказ {selectedOrder.number}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {renderOrderDetails()}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </div>
  );

  function renderOrderDetails() {
    if (!selectedOrder) return null;

    return (
      <>
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(selectedOrder.status)}>
              {getStatusLabel(selectedOrder.status)}
            </Badge>
            <Badge variant="outline">
              {getDistributionLabel(selectedOrder.distribution)}
            </Badge>
          </div>
          <div className="text-sm text-gray-500">
            {selectedOrder.deliveryDate}
          </div>
        </div>

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Информация о клиенте
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Имя:</span>
              <span>{selectedOrder.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Телефон:</span>
              <span>{selectedOrder.customerPhone}</span>
            </div>
            {selectedOrder.address && (
              <div className="flex justify-between">
                <span className="text-gray-600">Адрес:</span>
                <span className="text-right">{selectedOrder.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Информация о доставке
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Дата:</span>
              <span>{selectedOrder.deliveryDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Время:</span>
              <span>{formatTimeSlot(selectedOrder.deliverySlot)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Курьер:</span>
              <span>{selectedOrder.courierName || 'Не назначен'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        {orderItems.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Товары ({orderItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {orderItems.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start text-sm py-2 border-b last:border-b-0">
                    <div className="flex-1">
                      <div>{item.productName}</div>
                      {item.serial && (
                        <div className="text-xs text-gray-500">S/N: {item.serial}</div>
                      )}
                      {item.isAccessory && (
                        <Badge variant="outline" className="text-xs mt-1">Аксессуар</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div>{item.quantity} x {item.price.toFixed(2)} BYN</div>
                      {item.discount > 0 && (
                        <div className="text-xs text-green-600">-{item.discount}%</div>
                      )}
                      <div>{item.amount.toFixed(2)} BYN</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Итого
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl">
              {selectedOrder.total?.toFixed(2) || 0} BYN
            </div>
          </CardContent>
        </Card>
      </>
    );
  }
}
