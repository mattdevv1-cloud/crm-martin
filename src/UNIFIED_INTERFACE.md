# ✅ Единый интерфейс для всех ролей

## 🎯 Концепция

Вместо отдельных интерфейсов для разных ролей, теперь **один интерфейс** с условным отображением элементов в зависимости от прав доступа.

## 🏗️ Архитектура

### Система прав доступа (`/utils/roles.ts`)

**Новый файл:** Централизованное управление правами

```typescript
interface RolePermissions {
  // Навигация
  canViewOrders: boolean;
  canViewCalendar: boolean;
  canViewProducts: boolean;
  // ... и т.д.
  
  // Особые режимы
  isCourierMode: boolean;
}
```

**5 ролей с детальными правами:**
- `admin` - полный доступ
- `sales_manager` - заказы, клиенты, отчёты
- `warehouse` - склад, товары
- `accountant` - отчёты, цены, аналитика
- `courier` - только доставки (специальный режим)

## 🔄 Ключевые изменения

### 1. **App.tsx** - Единая точка входа

**Было:**
```typescript
if (user?.role === 'courier') {
  return <CourierView />;
}
// ... отдел��ная логика для курьера
```

**Стало:**
```typescript
// Все роли используют один renderContent()
return (
  <>
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderContent()}
    </Layout>
    <MobileNav currentPage={currentPage} onNavigate={handleNavigate} />
  </>
);
```

### 2. **Layout.tsx** - Умное меню

**Фильтрация по правам:**
```typescript
const allMenuItems = [
  { id: 'orders', label: '...', icon: ..., permission: 'canViewOrders' },
  { id: 'products', label: '...', icon: ..., permission: 'canViewProducts' },
  // ...
];

// Показываем только доступные пункты
const menuItems = allMenuItems.filter(item => permissions[item.permission]);
```

**Адаптивные названия:**
- Курьер видит "Мои доставки" вместо "Заказы"
- Иконка Truck вместо Shopping Cart для курьера

### 3. **Orders.tsx** - Режим курьера встроен

**Два режима в одном компоненте:**

```typescript
if (permissions.isCourierMode) {
  // Отображаем режим курьера с календарём
  return <CourierCalendar ... />;
}

// Стандартный режим с таблицей
return <Table ... />;
```

**Компоненты:**
- `CourierCalendar` - календарь доставок
- `CourierBottomSheet` - детали заказа для курьера
- Все в Orders.tsx, но показывается условно

### 4. **MobileNav.tsx** - Адаптивная навигация

**Фильтрация пунктов:**
```typescript
const allNavItems = [
  { id: 'orders', label: permissions.isCourierMode ? 'Доставки' : 'Заказы', ... },
  // ...
];

const navItems = allNavItems.filter(item => permissions[item.permission]);
```

**Результат:**
- Курьер: только "Доставки" и "Календарь"
- Менеджер: полная навигация
- Склад: Заказы, Склад
- И т.д.

## 📊 Матрица прав доступа

| Страница | Админ | Менеджер | Склад | Бухгалтер | Курьер |
|----------|-------|----------|-------|-----------|--------|
| Заказы | ✅ | ✅ | ✅ | ✅ | ✅ (режим доставки) |
| Календарь | ✅ | ✅ | ❌ | ❌ | ✅ |
| Склад | ✅ | ✅ (просмотр) | ✅ | ✅ (просмотр) | ❌ |
| Клиенты | ✅ | ✅ | ❌ | ✅ (просмотр) | ❌ |
| Отчёты | ✅ | ✅ | ❌ | ✅ | ❌ |
| Настройки | ✅ | ❌ | ❌ | ❌ | ❌ |
| Группы | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dashboard | ✅ | ✅ | ❌ | ✅ | ❌ |
| Аудит | ✅ | ✅ | ✅ | ✅ | ❌ |

## 🎨 Визуальные различия

### Для курьера:
```
┌─────────────────────────────────┐
│  📅 Календарь    📋 Список     │  ← Переключатель
├─────────────────────────────────┤
│  [Пн] [Вт] [Ср] [Чт] [Пт]     │  ← Неделя
│   5    6    7    8    9        │
│  3/5  1/3  0/2  ✓   —          │  ← Прогресс
├─────────────────────────────────┤
│  Заказы по временным слотам     │
└─────────────────────────────────┘
```

### Для менеджера:
```
┌─────────────────────────────────┐
│  [+ Создать заказ]             │  ← Действия
├─────────────────────────────────┤
│  Фильтры: Статус | Распределение│
├─────────────────────────────────┤
│  Таблица заказов               │
│  | № | Дата | Клиент | Статус |│
└─────────────────────────────────┘
```

## 🔐 Безопасность

### Проверка на уровне UI
```typescript
{permissions.canCreateOrder && (
  <Button onClick={onCreateOrder}>Создать заказ</Button>
)}
```

### Проверка на уровне роутинга
```typescript
if (!canAccessPage(user, currentPage)) {
  // Редирект на доступную страницу
  const firstAvailable = availablePages.find(page => canAccessPage(user, page));
  setCurrentPage(firstAvailable);
}
```

### Проверка на уровне сервера
```typescript
// В /supabase/functions/server/index.tsx
if (user.role === 'courier') {
  orders = orders.filter(order => {
    return order.courierId === user.id 
      && isDeliverable(order.status)
      && isToday OrTomorrow(order.deliveryDate);
  });
}
```

## 📦 Структура файлов

### Новые файлы:
```
/utils/roles.ts                    - Система прав
/components/CourierBottomSheet.tsx - Bottom sheet для курьера
```

### Обновлённые файлы:
```
/App.tsx                - Единая логика для всех
/components/Layout.tsx  - Фильтрация меню
/components/Orders.tsx  - Режим курьера встроен
/components/MobileNav.tsx - Адаптивная навигация
```

### Удалённые файлы:
```
/components/CourierView.tsx - ❌ Больше не нужен
```

## 🎯 Преимущества

### 1. **Единая кодовая база**
- Легче поддерживать
- Меньше дублирования
- Проще тестировать

### 2. **Гибкость**
- Легко добавить новую роль
- Легко изменить права
- Всё в одном месте (`roles.ts`)

### 3. **Консистентность**
- Одинаковый UX для базовых функций
- Единая система дизайна
- Меньше путаницы для пользователей

### 4. **Масштабируемость**
- Добавление новой функции = просто добавить permission
- Новая роль = описать permissions в одном месте
- Условия проверяются автоматически

## 🚀 Использование

### Добавление новой роли

1. **Обновить тип в `roles.ts`:**
```typescript
export type Role = 'admin' | 'sales_manager' | 'warehouse' | 'accountant' | 'courier' | 'new_role';
```

2. **Описать права:**
```typescript
const permissions: Record<Role, RolePermissions> = {
  // ...
  new_role: {
    canViewOrders: true,
    canCreateOrder: false,
    // ... все permissions
  },
};
```

3. **Готово!** Интерфейс автоматически адаптируется

### Добавление нового permission

1. **Добавить в интерфейс:**
```typescript
interface RolePermissions {
  // ...
  canExportData: boolean;
}
```

2. **Установить для всех ролей:**
```typescript
admin: {
  // ...
  canExportData: true,
},
courier: {
  // ...
  canExportData: false,
},
```

3. **Использовать в UI:**
```typescript
{permissions.canExportData && (
  <Button>Экспорт</Button>
)}
```

## 📱 Мобильная адаптация

### Десктоп:
- Боковое меню (Layout)
- Полная таблица
- Все фильтры

### Мобильный:
- Нижняя навигация (MobileNav)
- Карточки вместо таблиц
- Упрощённые фильтры

### Курьер (всегда мобильный):
- Календарь доставок
- Bottom Sheet для деталей
- Быстрые действия

## 🧪 Тестирование

### Проверка прав:
```typescript
import { getRolePermissions } from './utils/roles';

const courierPerms = getRolePermissions('courier');
expect(courierPerms.canViewProducts).toBe(false);
expect(courierPerms.isCourierMode).toBe(true);
```

### Проверка доступа:
```typescript
import { canAccessPage } from './utils/roles';

const courier = { id: 1, role: 'courier', ... };
expect(canAccessPage(courier, 'products')).toBe(false);
expect(canAccessPage(courier, 'orders')).toBe(true);
```

## 📚 Связанные документы

- [COURIER_GUIDE.md](COURIER_GUIDE.md) - Руководство курьера
- [MANAGER_COURIER_GUIDE.md](MANAGER_COURIER_GUIDE.md) - Работа с курьерами
- [COURIER_CHECKLIST.md](COURIER_CHECKLIST.md) - Чек-лист назначения
- [README.md](README.md) - Общая документация

## 🎉 Итог

✅ **Один интерфейс** для всех ролей  
✅ **Условное отображение** элементов  
✅ **Централизованные права** в `/utils/roles.ts`  
✅ **Легко расширяется** новыми ролями и правами  
✅ **Безопасно** - проверка на всех уровнях  
✅ **Адаптивно** - работает на desktop и mobile  

---

**Версия:** 3.0  
**Дата:** Октябрь 2025  
**Миграция:** CourierView → Unified Interface
