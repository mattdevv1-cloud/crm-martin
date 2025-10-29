import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Loader2, Search, Download } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';

interface AuditLog {
  entity: string;
  entityId: string;
  action: string;
  userId: string;
  snapshot: any;
  timestamp: string;
}

export function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const data = await apiCall('/audit');
      setLogs(data.logs);
    } catch (error: any) {
      toast.error('Ошибка загрузки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, any> = {
      create: { variant: 'default', label: 'Создание', color: 'bg-green-100 text-green-800' },
      update: { variant: 'secondary', label: 'Изменение', color: 'bg-blue-100 text-blue-800' },
      delete: { variant: 'destructive', label: 'Удаление', color: 'bg-red-100 text-red-800' },
      status_change: { variant: 'outline', label: 'Смена статуса', color: 'bg-purple-100 text-purple-800' },
    };
    const config = variants[action] || { variant: 'outline', label: action, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getEntityLabel = (entity: string) => {
    const labels: Record<string, string> = {
      group: 'Группа',
      product: 'Товар',
      order: 'Заказ',
      stock_unit: 'Складская позиция',
      platform: 'Платформа',
    };
    return labels[entity] || entity;
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEntity = filterEntity === 'all' || log.entity === filterEntity;
    
    return matchesSearch && matchesEntity;
  });

  const uniqueEntities = Array.from(new Set(logs.map(log => log.entity)));

  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('Нет данных для экспорта');
      return;
    }
    
    const csvContent = [
      'Дата,Время,Сущность,ID,Действие,Пользователь',
      ...filteredLogs.map(log => {
        const date = new Date(log.timestamp);
        return [
          date.toLocaleDateString('ru-RU'),
          date.toLocaleTimeString('ru-RU'),
          getEntityLabel(log.entity),
          log.entityId,
          log.action,
          log.userId,
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Журнал экспортирован');
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl mb-2">Журнал аудита</h1>
          <p className="text-gray-600">История всех изменений в системе</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="w-full md:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 md:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Поиск</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="ID записи, пользователь..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Сущность</Label>
            <select
              className="w-full h-10 rounded-md border border-gray-300 px-3"
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
            >
              <option value="all">Все сущности</option>
              {uniqueEntities.map(entity => (
                <option key={entity} value={entity}>
                  {getEntityLabel(entity)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата и время</TableHead>
              <TableHead>Сущность</TableHead>
              <TableHead>ID записи</TableHead>
              <TableHead>Действие</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead>Детали</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  Нет записей в журнале
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log, index) => {
                const date = new Date(log.timestamp);
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <div>{date.toLocaleDateString('ru-RU')}</div>
                        <div className="text-xs text-gray-600">
                          {date.toLocaleTimeString('ru-RU')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getEntityLabel(log.entity)}</TableCell>
                    <TableCell>{log.entityId}</TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {log.userId.substring(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.action === 'status_change' && log.snapshot ? (
                        <div className="text-xs text-gray-600">
                          {log.snapshot.from} → {log.snapshot.to}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600">—</div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filteredLogs.length > 0 && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-gray-600 mb-2">Всего записей</div>
              <div className="text-3xl">{filteredLogs.length}</div>
            </div>
            <div>
              <div className="text-gray-600 mb-2">Создано</div>
              <div className="text-3xl">
                {filteredLogs.filter(l => l.action === 'create').length}
              </div>
            </div>
            <div>
              <div className="text-gray-600 mb-2">Изменено</div>
              <div className="text-3xl">
                {filteredLogs.filter(l => l.action === 'update').length}
              </div>
            </div>
            <div>
              <div className="text-gray-600 mb-2">Удалено</div>
              <div className="text-3xl">
                {filteredLogs.filter(l => l.action === 'delete').length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
