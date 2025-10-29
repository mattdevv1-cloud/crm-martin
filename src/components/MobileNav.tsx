import React from 'react';
import { ShoppingCart, Calendar, Package, Search, Menu, Truck, Settings, MoreHorizontal } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useRolePermissions } from '../utils/roles';

interface MobileNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function MobileNav({ currentPage, onNavigate }: MobileNavProps) {
  const { user } = useAuth();
  const permissions = useRolePermissions(user);

  // Build nav items based on permissions - максимум 5 элементов для мобильного
  const settingsLabel = permissions.isCourierMode ? 'Меню' : (permissions.canViewDashboard ? 'Ещё' : 'Меню');
  
  const allNavItems = [
    { id: 'orders', label: permissions.isCourierMode ? 'Доставки' : 'Заказы', icon: permissions.isCourierMode ? Truck : ShoppingCart, permission: 'canViewOrders' as const },
    { id: 'calendar', label: 'Календарь', icon: Calendar, permission: 'canViewCalendar' as const },
    { id: 'products', label: 'Склад', icon: Package, permission: 'canViewProducts' as const },
    { id: 'customers', label: 'Клиенты', icon: Search, permission: 'canViewCustomers' as const },
    { id: 'dashboard', label: 'Главная', icon: Menu, permission: 'canViewDashboard' as const },
    { id: 'settings', label: settingsLabel, icon: MoreHorizontal, permission: 'canViewSettings' as const },
  ];

  const navItems = allNavItems.filter(item => permissions[item.permission]).slice(0, 5);

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: `calc(60px + env(safe-area-inset-bottom, 0px))`
      }}
    >
      <div className="flex items-stretch h-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 active:bg-gray-100'
              }`}
              style={{ minHeight: '44px' }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
