import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Plus, Edit, Trash2, Loader2, Package, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';
import { useAuth } from './AuthContext';
import { useRolePermissions } from '../utils/roles';

interface Product {
  id: number;
  sku: string;
  groupId: number;
  brand: string;
  model: string;
  description: string;
  priceBuy: number;
  priceSell: number;
  currency: string;
  unit: string;
  minStock: number;
  location: string;
  hasSerial: boolean;
  stockCount?: number;
  reservedCount?: number;
}

interface Group {
  id: number;
  name: string;
}

interface ProductsProps {
  onViewProduct?: (productId: number) => void;
}

export function Products({ onViewProduct }: ProductsProps) {
  const { user } = useAuth();
  const permissions = useRolePermissions(user);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    sku: '',
    groupId: 0,
    brand: '',
    model: '',
    description: '',
    priceBuy: 0,
    priceSell: 0,
    currency: 'BYN',
    unit: 'шт',
    minStock: 0,
    location: '',
    hasSerial: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, groupsData] = await Promise.all([
        apiCall('/products'),
        apiCall('/groups'),
      ]);
      setProducts(productsData.products);
      setGroups(groupsData.groups.filter((g: any) => g.active));
    } catch (error: any) {
      toast.error('Ошибка загрузки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        groupId: product.groupId,
        brand: product.brand,
        model: product.model,
        description: product.description || '',
        priceBuy: product.priceBuy,
        priceSell: product.priceSell,
        currency: product.currency || 'BYN',
        unit: product.unit || 'шт',
        minStock: product.minStock || 0,
        location: product.location || '',
        hasSerial: product.hasSerial || false,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        sku: '',
        groupId: groups[0]?.id || 0,
        brand: '',
        model: '',
        description: '',
        priceBuy: 0,
        priceSell: 0,
        currency: 'BYN',
        unit: 'шт',
        minStock: 0,
        location: '',
        hasSerial: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.sku || !formData.brand || !formData.model) {
        toast.error('Заполните обязательные поля');
        return;
      }

      if (editingProduct) {
        await apiCall(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        toast.success('Товар обновлён');
      } else {
        await apiCall('/products', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success('Товар создан');
      }
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error('Ошибка сохранения: ' + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот товар? Это действие необратимо.')) return;

    try {
      await apiCall(`/products/${id}`, { method: 'DELETE' });
      toast.success('Товар удалён');
      loadData();
    } catch (error: any) {
      toast.error('Ошибка удаления: ' + error.message);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = filterGroup === 'all' || product.groupId === parseInt(filterGroup);
    
    return matchesSearch && matchesGroup;
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl mb-2">Склад</h1>
          <p className="text-gray-600">Управление товарами и остатками</p>
        </div>
        {permissions.canCreateProduct && (
          <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Добавить товар
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 md:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Поиск</Label>
            <Input
              placeholder="SKU, бренд, модель..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Label>Группа</Label>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все группы</SelectItem>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Группа</TableHead>
              <TableHead>Бренд / Модель</TableHead>
              <TableHead>Цена продажи</TableHead>
              <TableHead>Остаток</TableHead>
              <TableHead>Зарезервировано</TableHead>
              <TableHead>Мин. остаток</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  Нет товаров
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const group = groups.find(g => g.id === product.groupId);
                const isLowStock = (product.stockCount || 0) < product.minStock;
                
                return (
                  <TableRow key={product.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell onClick={() => onViewProduct?.(product.id)}>
                      <div className="flex items-center gap-2">
                        {product.hasSerial && (
                          <Package className="h-4 w-4 text-blue-600" />
                        )}
                        {product.sku}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => onViewProduct?.(product.id)}>
                      {group?.name || '—'}
                    </TableCell>
                    <TableCell onClick={() => onViewProduct?.(product.id)}>
                      <div>
                        <div>{product.brand}</div>
                        <div className="text-sm text-gray-600">{product.model}</div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => onViewProduct?.(product.id)}>
                      {product.priceSell} {product.currency}
                    </TableCell>
                    <TableCell onClick={() => onViewProduct?.(product.id)}>
                      <div className="flex items-center gap-2">
                        {product.stockCount || 0}
                        {isLowStock && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => onViewProduct?.(product.id)}>
                      {product.reservedCount || 0}
                    </TableCell>
                    <TableCell onClick={() => onViewProduct?.(product.id)}>
                      {product.minStock}
                    </TableCell>
                    <TableCell className="text-right">
                      {permissions.canEditProduct && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {permissions.canDeleteProduct && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Редактировать товар' : 'Создать товар'}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию о товаре
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Артикул *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Например: SMT-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupId">Группа *</Label>
                <Select
                  value={formData.groupId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, groupId: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Бренд *</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Например: Apple"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Модель *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Например: iPhone 15 Pro"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание товара"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceBuy">Цена закупки</Label>
                <Input
                  id="priceBuy"
                  type="number"
                  value={formData.priceBuy}
                  onChange={(e) => setFormData({ ...formData, priceBuy: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceSell">Цена продажи *</Label>
                <Input
                  id="priceSell"
                  type="number"
                  value={formData.priceSell}
                  onChange={(e) => setFormData({ ...formData, priceSell: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Валюта</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BYN">BYN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="RUB">RUB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minStock">Мин. остаток</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Единица</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Местоположение</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Склад/полка"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasSerial"
                checked={formData.hasSerial}
                onChange={(e) => setFormData({ ...formData, hasSerial: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="hasSerial">Серийный учёт</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
