import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { ArrowLeft, Plus, Trash2, Loader2, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';
import { useAuth } from './AuthContext';
import { useRolePermissions } from '../utils/roles';

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  amount: number;
  serial?: string;
  isAccessory: boolean;
}

interface OrderCardProps {
  orderId: number | null;
  onBack: () => void;
}

export function OrderCard({ orderId, onBack }: OrderCardProps) {
  const { user } = useAuth();
  const permissions = useRolePermissions(user);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [stockUnits, setStockUnits] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    status: 'new',
    platformId: 0,
    distribution: 'minsk',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerComment: '',
    address: '',
    deliveryDate: '',
    deliverySlot: 'not_specified',
    courierId: null,
    courierComment: '',
    total: 0,
    discount: 0,
    deliveryCost: 0,
    prepayment: 0,
    paymentMethod: 'cash',
    paid: false,
  });

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    try {
      const [productsData, platformsData, usersData, stockUnitsData] = await Promise.all([
        apiCall('/products'),
        apiCall('/platforms'),
        apiCall('/users'),
        apiCall('/products').then(async () => {
          const units = await apiCall('/products');
          // Fetch all stock units
          const allUnits: any[] = [];
          for (const product of units.products) {
            if (product.hasSerial) {
              const productData = await apiCall(`/products/${product.id}`);
              allUnits.push(...(productData.stockUnits || []));
            }
          }
          return allUnits;
        }),
      ]);

      setProducts(productsData.products);
      setPlatforms(platformsData.platforms);
      setUsers(usersData.users);
      setStockUnits(stockUnitsData);

      if (orderId) {
        const orderData = await apiCall(`/orders/${orderId}`);
        setOrder(orderData.order);
        setItems(orderData.items || []);
        setFormData({
          status: orderData.order.status,
          platformId: orderData.order.platformId || 0,
          distribution: orderData.order.distribution || 'minsk',
          customerName: orderData.order.customerName || '',
          customerPhone: orderData.order.customerPhone || '',
          customerEmail: orderData.order.customerEmail || '',
          customerComment: orderData.order.customerComment || '',
          address: orderData.order.address || '',
          deliveryDate: orderData.order.deliveryDate || '',
          deliverySlot: orderData.order.deliverySlot || 'not_specified',
          courierId: orderData.order.courierId || null,
          courierComment: orderData.order.courierComment || '',
          total: orderData.order.total || 0,
          discount: orderData.order.discount || 0,
          deliveryCost: orderData.order.deliveryCost || 0,
          prepayment: orderData.order.prepayment || 0,
          paymentMethod: orderData.order.paymentMethod || 'cash',
          paid: orderData.order.paid || false,
        });
      }
    } catch (error: any) {
      toast.error('Ошибка загрузки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        productId: 0,
        productName: '',
        quantity: 1,
        price: 0,
        discount: 0,
        amount: 0,
        isAccessory: false,
      },
    ]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate amount
    if (field === 'quantity' || field === 'price' || field === 'discount') {
      const item = newItems[index];
      item.amount = item.quantity * item.price * (1 - item.discount / 100);
    }
    
    // Auto-fill product data
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].productName = `${product.brand} ${product.model}`;
        newItems[index].price = product.priceSell;
        newItems[index].amount = newItems[index].quantity * product.priceSell;
      }
    }
    
    setItems(newItems);
    
    // Recalculate total
    const subtotal = newItems.reduce((sum, item) => sum + item.amount, 0);
    setFormData({
      ...formData,
      total: subtotal - formData.discount + formData.deliveryCost,
    });
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    
    const subtotal = newItems.reduce((sum, item) => sum + item.amount, 0);
    setFormData({
      ...formData,
      total: subtotal - formData.discount + formData.deliveryCost,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!formData.customerName || !formData.customerPhone) {
        toast.error('Укажите имя и телефон клиента');
        return;
      }

      if (items.length === 0) {
        toast.error('Добавьте товары в заказ');
        return;
      }

      const payload = {
        order: {
          ...formData,
          deliverySlot: formData.deliverySlot === 'not_specified' ? '' : formData.deliverySlot,
        },
        items: items.map(item => ({
          productId: item.productId,
          name: item.productName,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          amount: item.amount,
          serial: item.serial,
          isAccessory: item.isAccessory,
        })),
      };

      if (orderId) {
        await apiCall(`/orders/${orderId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Заказ обновлён');
      } else {
        await apiCall('/orders', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Заказ создан');
        onBack();
      }
    } catch (error: any) {
      toast.error('Ошибка сохранения: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiCall(`/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success('Статус изменён');
      setFormData({ ...formData, status: newStatus });
      loadData();
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      picking: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const statusLabels: Record<string, string> = {
    new: 'Новый',
    in_progress: 'В работе',
    confirmed: 'Подтверждён',
    picking: 'Комплектация',
    shipped: 'Отгружен',
    completed: 'Завершён',
    cancelled: 'Отменён',
  };

  // Проверка прав на редактирование
  const canEdit = orderId ? permissions.canEditOrder : permissions.canCreateOrder;
  const canEditItems = canEdit;
  const canChangeStatus = permissions.canEditOrder;

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8">
      <Button onClick={onBack} variant="outline" className="mb-4 md:mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Назад к списку
      </Button>

      {!canEdit && orderId && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ℹ️ У вас нет прав на редактирование этого заказа. Вы можете только просматривать информацию.
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 md:mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl mb-2">
            {orderId ? `Заказ ${order?.number}` : 'Новый заказ'}
          </h1>
          {orderId && (
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(formData.status)}`}>
              {statusLabels[formData.status] || formData.status}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {orderId && formData.status !== 'completed' && canChangeStatus && (
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Новый</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="confirmed">Подтверждён</SelectItem>
                <SelectItem value="picking">Комплектация</SelectItem>
                <SelectItem value="shipped">Отгружен</SelectItem>
                <SelectItem value="completed">Завершён</SelectItem>
                <SelectItem value="cancelled">Отменён</SelectItem>
              </SelectContent>
            </Select>
          )}
          {canEdit && (
            <Button onClick={handleSave} disabled={saving} className="flex-1 md:flex-initial">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Сохранить
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Информация о клиенте</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">ФИО / Компания *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">Телефон *</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="+375 ..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platformId">Платформа</Label>
                <Select
                  value={formData.platformId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, platformId: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите платформу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Не указана</SelectItem>
                    {platforms.map(platform => (
                      <SelectItem key={platform.id} value={platform.id.toString()}>
                        {platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerComment">Комментарий клиента</Label>
              <Textarea
                id="customerComment"
                value={formData.customerComment}
                onChange={(e) => setFormData({ ...formData, customerComment: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Logistics */}
        <Card>
          <CardHeader>
            <CardTitle>Логистика</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distribution">Распределение</Label>
                <Select
                  value={formData.distribution}
                  onValueChange={(value) => setFormData({ ...formData, distribution: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minsk">Минск</SelectItem>
                    <SelectItem value="shipping">Отправки</SelectItem>
                    <SelectItem value="pickup">Самовывоз</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Дата доставки</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliverySlot">Временной интервал</Label>
                <Select
                  value={formData.deliverySlot}
                  onValueChange={(value) => setFormData({ ...formData, deliverySlot: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите интервал" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_specified">Не указан</SelectItem>
                    <SelectItem value="09:00-12:00">09:00-12:00</SelectItem>
                    <SelectItem value="12:00-15:00">12:00-15:00</SelectItem>
                    <SelectItem value="15:00-18:00">15:00-18:00</SelectItem>
                    <SelectItem value="18:00-21:00">18:00-21:00</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Адрес доставки</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Улица, дом, квартира"
              />
            </div>

            {permissions.canAssignCourier && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courierId">Курьер</Label>
                  <Select
                    value={formData.courierId || 'not_assigned'}
                    onValueChange={(value) => setFormData({ ...formData, courierId: value === 'not_assigned' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите курьера" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_assigned">Не назначен</SelectItem>
                      {users.filter(u => u.role === 'courier').map(courier => (
                        <SelectItem key={courier.id} value={courier.id}>
                          {courier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    💡 Курьер увидит заказ если: статус "Подтверждён" или выше + дата сегодня/завтра
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="courierComment">Комментарий для курьера</Label>
                  <Textarea
                    id="courierComment"
                    value={formData.courierComment}
                    onChange={(e) => setFormData({ ...formData, courierComment: e.target.value })}
                    placeholder="Особые указания для доставки"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Состав заказа</CardTitle>
              {(permissions.canEditOrder || permissions.canCreateOrder) && (
                <Button onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить товар
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Товар</TableHead>
                    <TableHead>Кол-во</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Скидка %</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Серийник</TableHead>
                    <TableHead>Аксессуар</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-4">
                        Нет товаров
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => {
                      const product = products.find(p => p.id === item.productId);
                      const availableSerials = stockUnits.filter(
                        u => u.productId === item.productId && u.status === 'available'
                      );

                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.productId.toString()}
                              onValueChange={(value) => updateItem(index, 'productId', parseInt(value))}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Выберите товар" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map(p => (
                                  <SelectItem key={p.id} value={p.id.toString()}>
                                    {p.brand} {p.model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value))}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>{item.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            {product?.hasSerial ? (
                              <Select
                                value={item.serial || ''}
                                onValueChange={(value) => updateItem(index, 'serial', value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Выберите" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableSerials.map(u => (
                                    <SelectItem key={u.id} value={u.serial}>
                                      {u.serial}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={item.isAccessory}
                              onChange={(e) => updateItem(index, 'isAccessory', e.target.checked)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell>
                            {(permissions.canEditOrder || permissions.canCreateOrder) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Financial Info */}
        <Card>
          <CardHeader>
            <CardTitle>Финансовая информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Скидка</Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount}
                  onChange={(e) => {
                    const discount = parseFloat(e.target.value);
                    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
                    setFormData({
                      ...formData,
                      discount,
                      total: subtotal - discount + formData.deliveryCost,
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryCost">Стоимость доставки</Label>
                <Input
                  id="deliveryCost"
                  type="number"
                  value={formData.deliveryCost}
                  onChange={(e) => {
                    const deliveryCost = parseFloat(e.target.value);
                    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
                    setFormData({
                      ...formData,
                      deliveryCost,
                      total: subtotal - formData.discount + deliveryCost,
                    });
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prepayment">Предоплата</Label>
                <Input
                  id="prepayment"
                  type="number"
                  value={formData.prepayment}
                  onChange={(e) => setFormData({ ...formData, prepayment: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Способ оплаты</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Наличные</SelectItem>
                    <SelectItem value="card">Карта</SelectItem>
                    <SelectItem value="transfer">Перевод</SelectItem>
                    <SelectItem value="online">Онлайн</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <input
                  type="checkbox"
                  id="paid"
                  checked={formData.paid}
                  onChange={(e) => setFormData({ ...formData, paid: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="paid">Оплачено</Label>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-xl">Итоговая сумма:</span>
                <span className="text-3xl">{formData.total.toFixed(2)} BYN</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
