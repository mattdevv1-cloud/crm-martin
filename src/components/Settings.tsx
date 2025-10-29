import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Plus, Edit, Trash2, Loader2, User, Lock, Bell, AlertTriangle, LogOut, UserPlus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from './AuthContext';
import { useRolePermissions } from '../utils/roles';
import { Switch } from './ui/switch';

interface Platform {
  id: number;
  name: string;
  description: string;
}

export function Settings() {
  const { user, signOut } = useAuth();
  const permissions = useRolePermissions(user);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Profile settings
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notifications
  const [notifications, setNotifications] = useState({
    emailOrders: true,
    emailDelivery: true,
    pushOrders: false,
    pushDelivery: true,
    smsOrders: false,
  });

  useEffect(() => {
    if (permissions.canManageUsers) {
      loadPlatforms();
    } else {
      setLoading(false);
    }
  }, [permissions.canManageUsers]);

  const loadPlatforms = async () => {
    try {
      const data = await apiCall('/platforms');
      setPlatforms(data.platforms);
    } catch (error: any) {
      toast.error('Ошибка загрузки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (platform?: Platform) => {
    if (platform) {
      setEditingPlatform(platform);
      setFormData({
        name: platform.name,
        description: platform.description || '',
      });
    } else {
      setEditingPlatform(null);
      setFormData({ name: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name) {
        toast.error('Укажите название платформы');
        return;
      }

      if (editingPlatform) {
        toast.error('Редактирование не реализовано');
      } else {
        await apiCall('/platforms', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success('Платформа добавлена');
      }
      setDialogOpen(false);
      loadPlatforms();
    } catch (error: any) {
      toast.error('Ошибка сохранения: ' + error.message);
    }
  };

  const handleClearAll = async () => {
    if (confirmText !== 'УДАЛИТЬ ВСЁ') {
      toast.error('Введите "УДАЛИТЬ ВСЁ" для подтверждения');
      return;
    }

    try {
      const result = await apiCall('/clear-all', { method: 'POST' });
      toast.success(result.message);
      setDeleteDialogOpen(false);
      setConfirmText('');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    }
  };

  const handleSaveProfile = () => {
    toast.success('Профиль сохранён');
  };

  const handleChangePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Заполните все поля');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }

    toast.success('Пароль изменён');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleSwitchAccount = () => {
    signOut();
    toast.success('Выполнен выход из системы');
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8">
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl mb-2">Настройки</h1>
        <p className="text-gray-600">
          {permissions.canManageUsers 
            ? 'Управление профилем и системными параметрами' 
            : 'Управление вашим профилем и настройками'}
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full md:w-auto flex-wrap h-auto">
          <TabsTrigger value="profile">Профиль</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          <TabsTrigger value="account">Аккаунт</TabsTrigger>
          {permissions.canManageUsers && <TabsTrigger value="platforms">Платформы</TabsTrigger>}
          {permissions.canManageUsers && <TabsTrigger value="statuses">Статусы</TabsTrigger>}
          {permissions.canManageUsers && <TabsTrigger value="system">Система</TabsTrigger>}
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="mt-4 md:mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl md:text-3xl">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="mb-1">{user?.name}</CardTitle>
                    <CardDescription className="mb-0">{user?.email}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileName">Имя *</Label>
                <Input
                  id="profileName"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder="Ваше имя"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileEmail">Email *</Label>
                <Input
                  id="profileEmail"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profilePhone">Телефон</Label>
                <Input
                  id="profilePhone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+375 29 123-45-67"
                />
              </div>

              <div className="space-y-2">
                <Label>Роль в системе</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="capitalize">{user?.role}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {user?.role === 'admin' && 'Полный доступ ко всем функциям'}
                    {user?.role === 'sales_manager' && 'Управление заказами и клиентами'}
                    {user?.role === 'warehouse' && 'Управление складом и товарами'}
                    {user?.role === 'accountant' && 'Просмотр отчётов и аналитики'}
                    {user?.role === 'courier' && 'Доставка заказов'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveProfile} className="flex-1 md:flex-initial">
                  Сохранить изменения
                </Button>
                <Button variant="outline" onClick={() => {
                  setProfileData({
                    name: user?.name || '',
                    email: user?.email || '',
                    phone: '',
                  });
                }}>
                  Отменить
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="mt-4 md:mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <CardTitle>Изменение пароля</CardTitle>
              </div>
              <CardDescription>
                Обновите свой пароль для входа в систему
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Текущий пароль *</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Новый пароль *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-600">Минимум 6 символов</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтвердите новый пароль *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleChangePassword} className="flex-1 md:flex-initial">
                  Изменить пароль
                </Button>
                <Button variant="outline" onClick={() => {
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}>
                  Отменить
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Активные сеансы</CardTitle>
              <CardDescription>
                Управление устройствами с доступом к вашему аккаунту
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span>Текущее устройство</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Активно
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date().toLocaleDateString('ru-RU')} в {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications" className="mt-4 md:mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Уведомления</CardTitle>
              </div>
              <CardDescription>
                Настройте, как вы хотите получать уведомления
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Email уведомления</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailOrders">Новые заказы</Label>
                      <p className="text-sm text-gray-600">Получать уведомления о новых заказах</p>
                    </div>
                    <Switch
                      id="emailOrders"
                      checked={notifications.emailOrders}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailOrders: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailDelivery">Статус доставки</Label>
                      <p className="text-sm text-gray-600">Обновления по доставке заказов</p>
                    </div>
                    <Switch
                      id="emailDelivery"
                      checked={notifications.emailDelivery}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailDelivery: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium mb-3">Push уведомления</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="pushOrders">Новые заказы</Label>
                      <p className="text-sm text-gray-600">Push-уведомления в браузере</p>
                    </div>
                    <Switch
                      id="pushOrders"
                      checked={notifications.pushOrders}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, pushOrders: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="pushDelivery">Статус доставки</Label>
                      <p className="text-sm text-gray-600">Моментальные уведомления о доставках</p>
                    </div>
                    <Switch
                      id="pushDelivery"
                      checked={notifications.pushDelivery}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, pushDelivery: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium mb-3">SMS уведомления</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="smsOrders">Срочные заказы</Label>
                      <p className="text-sm text-gray-600">SMS для важных заказов</p>
                    </div>
                    <Switch
                      id="smsOrders"
                      checked={notifications.smsOrders}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, smsOrders: checked })}
                    />
                  </div>
                </div>
              </div>

              <Button className="w-full md:w-auto">
                Сохранить настройки
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACCOUNT TAB */}
        <TabsContent value="account" className="mt-4 md:mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Управление аккаунтом</CardTitle>
              <CardDescription>
                Действия с вашим аккаунтом
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <UserPlus className="h-4 w-4 text-blue-600" />
                        <h3 className="font-medium">Сменить аккаунт</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Выйти из текущего аккаунта и войти с другими учётными данными
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleSwitchAccount} className="flex-shrink-0">
                      Сменить
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <LogOut className="h-4 w-4 text-gray-600" />
                        <h3 className="font-medium">Выйти из системы</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Завершить текущий сеанс работы
                      </p>
                    </div>
                    <Button variant="outline" onClick={signOut} className="flex-shrink-0">
                      <LogOut className="h-4 w-4 mr-2" />
                      Выйти
                    </Button>
                  </div>
                </div>
              </div>

              {permissions.isCourierMode && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Совет для курьеров</h4>
                  <p className="text-sm text-blue-800">
                    Используйте функцию "Сменить аккаунт" если работаете на общем устройстве. 
                    Это безопаснее, чем просто выйти.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADMIN-ONLY TABS */}
        {permissions.canManageUsers && (
          <>
            <TabsContent value="platforms" className="mt-4 md:mt-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <CardTitle>Каналы продаж</CardTitle>
                    <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить платформу
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Название</TableHead>
                          <TableHead>Описание</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {platforms.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                              Нет платформ
                            </TableCell>
                          </TableRow>
                        ) : (
                          platforms.map((platform) => (
                            <TableRow key={platform.id}>
                              <TableCell>{platform.id}</TableCell>
                              <TableCell>{platform.name}</TableCell>
                              <TableCell>{platform.description || '—'}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(platform)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statuses" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Цепочка статусов заказов</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div>Новый</div>
                        <div className="text-sm text-gray-600">Заказ создан, ожидает обработки</div>
                      </div>
                      <div className="text-blue-600">→</div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div>В работе</div>
                        <div className="text-sm text-gray-600">Менеджер обрабатывает заказ</div>
                      </div>
                      <div className="text-blue-600">→</div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div>Подтверждён</div>
                        <div className="text-sm text-gray-600">Клиент подтвердил заказ</div>
                      </div>
                      <div className="text-blue-600">→</div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div>Комплектация</div>
                        <div className="text-sm text-gray-600">Товары резервируются на складе</div>
                      </div>
                      <div className="text-blue-600">→</div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div>Отгружен</div>
                        <div className="text-sm text-gray-600">Товар передан на доставку</div>
                      </div>
                      <div className="text-blue-600">→</div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-green-50">
                      <div className="flex-1">
                        <div>Завершён</div>
                        <div className="text-sm text-gray-600">Заказ выполнен</div>
                      </div>
                      <div className="text-green-600">✓</div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-red-50">
                      <div className="flex-1">
                        <div>Отменён</div>
                        <div className="text-sm text-gray-600">Заказ отменён клиентом или менеджером</div>
                      </div>
                      <div className="text-red-600">✗</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Информация о системе</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Версия:</span>
                      <span>2.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Последнее обновление:</span>
                      <span>Октябрь 2025</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">База данных:</span>
                      <span className="text-green-600">✓ Подключена</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <CardTitle className="text-red-900">Опасная зона</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-red-900">Очистка всех данных</Label>
                      <p className="text-sm text-red-700 mt-1">
                        Удалит ВСЕ данные из системы: товары, заказы, клиентов, группы, платформы и журнал аудита. 
                        Это действие необратимо!
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={() => setDeleteDialogOpen(true)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить все данные
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Dialogs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPlatform ? 'Редактировать платформу' : 'Добавить платформу'}
            </DialogTitle>
            <DialogDescription>
              Укажите название канала продаж
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Instagram"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание канала"
              />
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              Удалить все данные?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="text-red-700">
                Это действие удалит ВСЕ данные из системы без возможности восстановления:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Все товары и серийные номера</li>
                <li>Все заказы и их позиции</li>
                <li>Всех клиентов</li>
                <li>Все группы товаров</li>
                <li>Все платформы</li>
                <li>Весь журнал аудита</li>
                <li>Все движения товара</li>
              </ul>
              <div className="space-y-2 pt-4">
                <Label htmlFor="confirmDelete" className="text-red-900">
                  Введите <strong>УДАЛИТЬ ВСЁ</strong> для подтверждения:
                </Label>
                <Input
                  id="confirmDelete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="УДАЛИТЬ ВСЁ"
                  className="border-red-300"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false);
                setConfirmText('');
              }}
            >
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleClearAll}
              disabled={confirmText !== 'УДАЛИТЬ ВСЁ'}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить все данные
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
