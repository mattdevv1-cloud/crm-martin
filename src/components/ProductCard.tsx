import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { ArrowLeft, Plus, Trash2, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';

interface StockUnit {
  id: number;
  productId: number;
  serial: string;
  condition: string;
  arrivedAt: string;
  supplier: string;
  buyPrice: number;
  warrantyMonths: number;
  status: string;
  orderId?: number;
}

interface ProductCardProps {
  productId: number;
  onBack: () => void;
}

export function ProductCard({ productId, onBack }: ProductCardProps) {
  const [product, setProduct] = useState<any>(null);
  const [stockUnits, setStockUnits] = useState<StockUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    serial: '',
    condition: 'new',
    supplier: '',
    buyPrice: 0,
    warrantyMonths: 12,
  });

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      const data = await apiCall(`/products/${productId}`);
      setProduct(data.product);
      setStockUnits(data.stockUnits || []);
    } catch (error: any) {
      toast.error('Ошибка загрузки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    try {
      if (!formData.serial) {
        toast.error('Укажите серийный номер');
        return;
      }

      await apiCall('/stock-units', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          ...formData,
        }),
      });
      
      toast.success('Товар добавлен на склад');
      setDialogOpen(false);
      setFormData({
        serial: '',
        condition: 'new',
        supplier: '',
        buyPrice: product.priceBuy || 0,
        warrantyMonths: 12,
      });
      loadProduct();
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    }
  };

  const handleDeleteUnit = async (unitId: number) => {
    if (!confirm('Удалить эту позицию?')) return;

    try {
      await apiCall(`/stock-units/${unitId}`, { method: 'DELETE' });
      toast.success('Позиция удалена');
      loadProduct();
    } catch (error: any) {
      toast.error('Ошибка удаления: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      available: { variant: 'default', label: 'В наличии' },
      reserved: { variant: 'secondary', label: 'Зарезервирован' },
      sold: { variant: 'outline', label: 'Продан' },
      return: { variant: 'destructive', label: 'Возврат' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      new: 'Новый',
      refurb: 'Восстановленный',
      used: 'Б/У',
    };
    return labels[condition] || condition;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-gray-600">Товар не найден</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
      </div>
    );
  }

  const availableCount = stockUnits.filter(u => u.status === 'available').length;
  const reservedCount = stockUnits.filter(u => u.status === 'reserved').length;

  return (
    <div className="p-4 md:p-8">
      <Button onClick={onBack} variant="outline" className="mb-4 md:mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Назад к списку
      </Button>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 md:mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl mb-2">{product.brand} {product.model}</h1>
          <p className="text-gray-600">SKU: {product.sku}</p>
        </div>
        {product.hasSerial && (
          <Button onClick={() => {
            setFormData({
              ...formData,
              buyPrice: product.priceBuy || 0,
            });
            setDialogOpen(true);
          }} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Добавить на склад
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        <Card>
          <CardHeader>
            <CardTitle>В наличии</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{availableCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Зарезервировано</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{reservedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Цена продажи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{product.priceSell} {product.currency}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Общая информация</TabsTrigger>
          {product.hasSerial && (
            <TabsTrigger value="stock">Серийные номера ({stockUnits.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info" className="mt-4 md:mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <Label>Группа</Label>
                  <p className="mt-1">{product.groupId}</p>
                </div>

                <div>
                  <Label>Бренд</Label>
                  <p className="mt-1">{product.brand}</p>
                </div>

                <div>
                  <Label>Модель</Label>
                  <p className="mt-1">{product.model}</p>
                </div>

                <div>
                  <Label>Местоположение</Label>
                  <p className="mt-1">{product.location || '—'}</p>
                </div>

                <div>
                  <Label>Цена закупки</Label>
                  <p className="mt-1">{product.priceBuy} {product.currency}</p>
                </div>

                <div>
                  <Label>Цена продажи</Label>
                  <p className="mt-1">{product.priceSell} {product.currency}</p>
                </div>

                <div>
                  <Label>Минимальный остаток</Label>
                  <p className="mt-1">{product.minStock}</p>
                </div>

                <div>
                  <Label>Серийный учёт</Label>
                  <p className="mt-1">{product.hasSerial ? 'Да' : 'Нет'}</p>
                </div>

                {product.description && (
                  <div className="col-span-2">
                    <Label>Описание</Label>
                    <p className="mt-1 text-gray-700">{product.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {product.hasSerial && (
          <TabsContent value="stock" className="mt-4 md:mt-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Серийный номер</TableHead>
                    <TableHead>Состояние</TableHead>
                    <TableHead>Дата прихода</TableHead>
                    <TableHead>Поставщик</TableHead>
                    <TableHead>Цена закупки</TableHead>
                    <TableHead>Гарантия</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockUnits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        Нет серийных номеров
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockUnits.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            {unit.serial}
                          </div>
                        </TableCell>
                        <TableCell>{getConditionLabel(unit.condition)}</TableCell>
                        <TableCell>
                          {new Date(unit.arrivedAt).toLocaleDateString('ru-RU')}
                        </TableCell>
                        <TableCell>{unit.supplier || '—'}</TableCell>
                        <TableCell>{unit.buyPrice} {product.currency}</TableCell>
                        <TableCell>{unit.warrantyMonths} мес.</TableCell>
                        <TableCell>{getStatusBadge(unit.status)}</TableCell>
                        <TableCell className="text-right">
                          {unit.status !== 'sold' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUnit(unit.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить товар на склад</DialogTitle>
            <DialogDescription>
              Укажите серийный номер и параметры прихода
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serial">Серийный номер *</Label>
              <Input
                id="serial"
                value={formData.serial}
                onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                placeholder="Например: IMEI или S/N"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Состояние</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Новый</SelectItem>
                  <SelectItem value="refurb">Восстановленный</SelectItem>
                  <SelectItem value="used">Б/У</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Поставщик</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Название поставщика"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buyPrice">Цена закупки</Label>
                <Input
                  id="buyPrice"
                  type="number"
                  value={formData.buyPrice}
                  onChange={(e) => setFormData({ ...formData, buyPrice: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warrantyMonths">Гарантия (мес.)</Label>
                <Input
                  id="warrantyMonths"
                  type="number"
                  value={formData.warrantyMonths}
                  onChange={(e) => setFormData({ ...formData, warrantyMonths: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddStock}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
