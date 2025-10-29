import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Loader2, Download, TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function Reports() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stockUnits, setStockUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersData, productsData] = await Promise.all([
        apiCall('/orders'),
        apiCall('/products'),
      ]);
      
      // Get stock units
      const allUnits: any[] = [];
      for (const product of productsData.products) {
        if (product.hasSerial) {
          try {
            const productData = await apiCall(`/products/${product.id}`);
            allUnits.push(...(productData.stockUnits || []));
          } catch (err) {
            // Continue if product data fails
          }
        }
      }
      
      setOrders(ordersData.orders);
      setProducts(productsData.products);
      setStockUnits(allUnits);
    } catch (error: any) {
      toast.error('Ошибка загрузки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
    return orderDate >= dateFrom && orderDate <= dateTo;
  });

  // Calculate sales stats
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const completedOrders = filteredOrders.filter(o => o.status === 'completed');
  const completedRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const averageCheck = completedOrders.length > 0 ? completedRevenue / completedOrders.length : 0;

  // Calculate margin (simplified - using average buy/sell prices)
  const margin = stockUnits
    .filter(u => u.status === 'sold')
    .reduce((sum, unit) => {
      const product = products.find(p => p.id === unit.productId);
      if (product) {
        return sum + (product.priceSell - (unit.buyPrice || product.priceBuy || 0));
      }
      return sum;
    }, 0);

  // Sales by platform
  const salesByPlatform = filteredOrders.reduce((acc: any, order) => {
    const key = order.platformId || 'Не указана';
    if (!acc[key]) {
      acc[key] = { count: 0, revenue: 0 };
    }
    acc[key].count++;
    acc[key].revenue += order.total || 0;
    return acc;
  }, {});

  // Sales by distribution
  const salesByDistribution = filteredOrders.reduce((acc: any, order) => {
    const key = order.distribution || 'Не указано';
    const label = key === 'minsk' ? 'Минск' : key === 'shipping' ? 'Отправки' : key === 'pickup' ? 'Самовывоз' : key;
    if (!acc[label]) {
      acc[label] = { count: 0, revenue: 0 };
    }
    acc[label].count++;
    acc[label].revenue += order.total || 0;
    return acc;
  }, {});

  // Stock by product
  const stockByProduct = products.map(product => {
    const available = stockUnits.filter(u => u.productId === product.id && u.status === 'available').length;
    const reserved = stockUnits.filter(u => u.productId === product.id && u.status === 'reserved').length;
    const sold = stockUnits.filter(u => u.productId === product.id && u.status === 'sold').length;
    
    return {
      product: `${product.brand} ${product.model}`,
      available,
      reserved,
      sold,
      minStock: product.minStock || 0,
      isLow: available < (product.minStock || 0),
    };
  });

  const lowStockProducts = stockByProduct.filter(p => p.isLow);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('Нет данных для экспорта');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    
    toast.success('Отчёт экспортирован');
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl mb-2">Отчёты</h1>
        <p className="text-gray-600">Аналитика продаж и остатков</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 md:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Период с</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Период по</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Экспорт в Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Всего заказов</CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{filteredOrders.length}</div>
            <p className="text-xs text-gray-600 mt-1">
              Завершено: {completedOrders.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Выручка</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{completedRevenue.toFixed(0)} BYN</div>
            <p className="text-xs text-gray-600 mt-1">
              Средний чек: {averageCheck.toFixed(0)} BYN
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Маржа</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{margin.toFixed(0)} BYN</div>
            <p className="text-xs text-gray-600 mt-1">
              {completedRevenue > 0 ? ((margin / completedRevenue) * 100).toFixed(1) : 0}% от выручки
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Низкие остатки</CardTitle>
            <Package className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{lowStockProducts.length}</div>
            <p className="text-xs text-gray-600 mt-1">
              Требуют закупки
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList>
          <TabsTrigger value="sales">Продажи</TabsTrigger>
          <TabsTrigger value="stock">Остатки</TabsTrigger>
          <TabsTrigger value="channels">Каналы</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4 md:mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <CardTitle>Продажи по типу доставки</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(
                    Object.entries(salesByDistribution).map(([key, val]: any) => ({
                      Тип: key,
                      Заказов: val.count,
                      Выручка: val.revenue.toFixed(2),
                    })),
                    'sales_by_distribution'
                  )}
                  className="w-full md:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип доставки</TableHead>
                    <TableHead>Количество заказов</TableHead>
                    <TableHead>Выручка</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(salesByDistribution).map(([key, value]: any) => (
                    <TableRow key={key}>
                      <TableCell>{key}</TableCell>
                      <TableCell>{value.count}</TableCell>
                      <TableCell>{value.revenue.toFixed(2)} BYN</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Остатки по товарам</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(
                    stockByProduct.map(p => ({
                      Товар: p.product,
                      В_наличии: p.available,
                      Зарезервировано: p.reserved,
                      Продано: p.sold,
                      Мин_остаток: p.minStock,
                      Низкий_остаток: p.isLow ? 'Да' : 'Нет',
                    })),
                    'stock_report'
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Товар</TableHead>
                    <TableHead>В наличии</TableHead>
                    <TableHead>Зарезервировано</TableHead>
                    <TableHead>Продано</TableHead>
                    <TableHead>Мин. остаток</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockByProduct.map((item, index) => (
                    <TableRow key={index} className={item.isLow ? 'bg-red-50' : ''}>
                      <TableCell>{item.product}</TableCell>
                      <TableCell>{item.available}</TableCell>
                      <TableCell>{item.reserved}</TableCell>
                      <TableCell>{item.sold}</TableCell>
                      <TableCell>{item.minStock}</TableCell>
                      <TableCell>
                        {item.isLow ? (
                          <span className="text-red-600">Низкий остаток</span>
                        ) : (
                          <span className="text-green-600">В норме</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Продажи по платформам</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(
                    Object.entries(salesByPlatform).map(([key, val]: any) => ({
                      Платформа: key,
                      Заказов: val.count,
                      Выручка: val.revenue.toFixed(2),
                    })),
                    'sales_by_platform'
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Платформа</TableHead>
                    <TableHead>Количество заказов</TableHead>
                    <TableHead>Выручка</TableHead>
                    <TableHead>Средний чек</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(salesByPlatform).map(([key, value]: any) => (
                    <TableRow key={key}>
                      <TableCell>{key}</TableCell>
                      <TableCell>{value.count}</TableCell>
                      <TableCell>{value.revenue.toFixed(2)} BYN</TableCell>
                      <TableCell>{(value.revenue / value.count).toFixed(2)} BYN</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
