import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Loader2, Search, User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastOrderDate: string;
  orderCount: number;
  totalSpent: number;
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await apiCall('/customers');
      setCustomers(data.customers);
    } catch (error: any) {
      toast.error('Ошибка загрузки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

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
        <h1 className="text-2xl md:text-3xl mb-2">Клиенты</h1>
        <p className="text-gray-600">База клиентов и история заказов</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 md:mb-6">
        <div className="max-w-md">
          <Label>Поиск</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Имя, телефон, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиент</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Количество заказов</TableHead>
              <TableHead>Общая сумма</TableHead>
              <TableHead>Последний заказ</TableHead>
              <TableHead>Средний чек</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  Нет клиентов
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => {
                const avgCheck = customer.totalSpent / customer.orderCount;
                return (
                  <TableRow key={customer.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <span>{customer.name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{customer.phone || '—'}</TableCell>
                    <TableCell>{customer.email || '—'}</TableCell>
                    <TableCell>{customer.orderCount}</TableCell>
                    <TableCell>{customer.totalSpent.toFixed(2)} BYN</TableCell>
                    <TableCell>
                      {customer.lastOrderDate ? 
                        new Date(customer.lastOrderDate).toLocaleDateString('ru-RU') : '—'}
                    </TableCell>
                    <TableCell>{avgCheck.toFixed(2)} BYN</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filteredCustomers.length > 0 && (
        <div className="mt-4 md:mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-gray-600 mb-2">Всего клиентов</div>
            <div className="text-3xl">{filteredCustomers.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-gray-600 mb-2">Общая сумма продаж</div>
            <div className="text-3xl">
              {filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0).toFixed(2)} BYN
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-gray-600 mb-2">Средний чек</div>
            <div className="text-3xl">
              {(filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / 
                filteredCustomers.reduce((sum, c) => sum + c.orderCount, 0)).toFixed(2)} BYN
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
