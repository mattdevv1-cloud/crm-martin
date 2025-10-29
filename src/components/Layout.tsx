import React from 'react';
import { useAuth } from './AuthContext';
import { Button } from './ui/button';
import { useRolePermissions } from '../utils/roles';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Calendar,
  BarChart3,
  Settings,
  FileText,
  LogOut,
  Layers,
  Truck,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  permission: keyof ReturnType<typeof useRolePermissions>;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, signOut } = useAuth();
  const permissions = useRolePermissions(user);

  const allMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard, permission: 'canViewDashboard' },
    { id: 'orders', label: permissions.isCourierMode ? 'Мои доставки' : 'Заказы', icon: permissions.isCourierMode ? Truck : ShoppingCart, permission: 'canViewOrders' },
    { id: 'calendar', label: 'Календарь', icon: Calendar, permission: 'canViewCalendar' },
    { id: 'products', label: 'Склад', icon: Package, permission: 'canViewProducts' },
    { id: 'groups', label: 'Группы товаров', icon: Layers, permission: 'canViewGroups' },
    { id: 'customers', label: 'Клиенты', icon: Users, permission: 'canViewCustomers' },
    { id: 'reports', label: 'Отчёты', icon: BarChart3, permission: 'canViewReports' },
    { id: 'audit', label: 'Аудит', icon: FileText, permission: 'canViewAudit' },
    { id: 'settings', label: 'Настройки', icon: Settings, permission: 'canViewSettings' },
  ];

  // Фильтруем пункты меню в зависимости от прав
  const menuItems = allMenuItems.filter(item => permissions[item.permission]);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Администратор',
      sales_manager: 'Менеджер продаж',
      warehouse: 'Кладовщик',
      accountant: 'Бухгалтер',
      courier: 'Курьер',
    };
    return labels[role] || role;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl mb-3">CRM Система</h1>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{getRoleLabel(user?.role || '')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
