import React from 'react';
import { useAuth } from './AuthContext';
import { useRolePermissions } from '../utils/roles';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  User, 
  Settings, 
  BarChart3, 
  FileText, 
  LogOut, 
  UserPlus,
  Bell,
  Lock,
  Layers,
  ChevronRight
} from 'lucide-react';

interface MobileMenuProps {
  onNavigate: (page: string) => void;
}

export function MobileMenu({ onNavigate }: MobileMenuProps) {
  const { user, signOut } = useAuth();
  const permissions = useRolePermissions(user);

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

  const menuSections = [
    {
      title: 'Навигация',
      items: [
        ...(permissions.canViewReports ? [{ id: 'reports', label: 'Отчёты', icon: BarChart3 }] : []),
        ...(permissions.canViewAudit ? [{ id: 'audit', label: 'Журнал аудита', icon: FileText }] : []),
        ...(permissions.canViewGroups ? [{ id: 'groups', label: 'Группы товаров', icon: Layers }] : []),
      ]
    },
    {
      title: 'Настройки',
      items: [
        { id: 'settings-profile', label: 'Профиль', icon: User, action: () => onNavigate('settings') },
        { id: 'settings-security', label: 'Безопасность', icon: Lock, action: () => onNavigate('settings') },
        { id: 'settings-notifications', label: 'Уведомления', icon: Bell, action: () => onNavigate('settings') },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-shrink-0 w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-2xl">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl mb-1">{user?.name}</h2>
            <p className="text-blue-100 text-sm">{user?.email}</p>
            <p className="text-blue-200 text-xs mt-1">{getRoleLabel(user?.role || '')}</p>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="p-4 space-y-4">
        {menuSections.map((section, index) => (
          section.items.length > 0 && (
            <Card key={index}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {section.items.map((item: any) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => item.action ? item.action() : onNavigate(item.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        style={{ minHeight: '56px' }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-gray-600" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )
        ))}

        {/* Account Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Действия</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              <button
                onClick={() => {
                  signOut();
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                style={{ minHeight: '56px' }}
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  <span>Сменить аккаунт</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                style={{ minHeight: '56px' }}
              >
                <div className="flex items-center gap-3">
                  <LogOut className="h-5 w-5 text-red-600" />
                  <span className="text-red-600">Выйти</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>CRM Система v2.0.0</p>
          <p className="text-xs mt-1">© 2025 Все права защищены</p>
        </div>
      </div>
    </div>
  );
}
