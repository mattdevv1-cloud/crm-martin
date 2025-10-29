import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  ShoppingCart, 
  Package, 
  AlertCircle, 
  TrendingUp,
  Clock,
  CheckCircle,
  Database 
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from './AuthContext';

interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  newOrders: number;
  inProgressOrders: number;
  totalProducts: number;
  totalStock: number;
  lowStock: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializingDemo, setInitializingDemo] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await apiCall('/stats/dashboard');
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitDemo = async () => {
    if (!confirm('Создать демо-данные? (Группы товаров, платформы и образцы товаров)')) return;
    
    try {
      setInitializingDemo(true);
      const result = await apiCall('/init-demo', { method: 'POST' });
      toast.success(result.message);
      loadStats();
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    } finally {
      setInitializingDemo(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2 md:w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Всего заказов',
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Сегодня заказов',
      value: stats?.todayOrders || 0,
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Новые заказы',
      value: stats?.newOrders || 0,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'В работе',
      value: stats?.inProgressOrders || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Товаров в каталоге',
      value: stats?.totalProducts || 0,
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'На складе',
      value: stats?.totalStock || 0,
      icon: CheckCircle,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      title: 'Низкие остатки',
      value: stats?.lowStock || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl mb-2">Дашборд</h1>
          <p className="text-gray-600">Обзор основных показателей</p>
        </div>
        {user?.role === 'admin' && stats?.totalProducts === 0 && (
          <Button onClick={handleInitDemo} disabled={initializingDemo} className="w-full md:w-auto">
            <Database className="h-4 w-4 mr-2" />
            {initializingDemo ? 'Создание...' : 'Создать демо-данные'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600">• Создать новый заказ</p>
            <p className="text-sm text-gray-600">• Добавить товар на склад</p>
            <p className="text-sm text-gray-600">• Посмотреть календарь доставок</p>
            <p className="text-sm text-gray-600">• Сформировать отчёт</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Требуют внимания</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats?.newOrders ? (
              <p className="text-sm text-orange-600">• {stats.newOrders} новых заказов</p>
            ) : null}
            {stats?.lowStock ? (
              <p className="text-sm text-red-600">• {stats.lowStock} товаров с низким остатком</p>
            ) : null}
            {!stats?.newOrders && !stats?.lowStock && (
              <p className="text-sm text-gray-600">Всё в порядке ✓</p>
            )}
          </CardContent>
        </Card>
      </div>

      {stats?.totalProducts === 0 && (
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>👋 Добро пожаловать в CRM систему!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2">Быстрый старт:</h3>
              <ol className="text-sm space-y-2 ml-5 list-decimal">
                <li>Нажмите кнопку <strong>"Создать демо-данные"</strong> выше для загрузки образцов</li>
                <li>Перейдите в <strong>Склад</strong> и добавьте товары на склад с серийными номерами</li>
                <li>Создайте первый заказ в разделе <strong>Заказы</strong></li>
                <li>Настройте платформы продаж в <strong>Настройках</strong></li>
              </ol>
            </div>
            <div className="pt-4 border-t border-blue-200">
              <h3 className="mb-2">Основные возможности:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>✓ Серийный учёт товаров</div>
                <div>✓ Управление заказами</div>
                <div>✓ Календарь доставок</div>
                <div>✓ Отчёты и аналитика</div>
                <div>✓ Журнал аудита</div>
                <div>✓ Роли и права доступа</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
