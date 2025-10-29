# Мобильная версия и PWA

## Обзор

CRM система теперь является полноценным Progressive Web App (PWA) с:
- Установкой на мобильные устройства
- Офлайн-режимом
- Адаптивным дизайном
- Специальным режимом для курьеров

## PWA Функциональность

### Service Worker
Местоположение: `/public/sw.js`

**Возможности:**
- Кеширование shell приложения
- Кеширование API-запросов
- Офлайн fallback
- Background sync

**Стратегии кеширования:**
- **Shell**: Cache first
- **API**: Network first with cache fallback
- **Images**: Cache with network update

### Web App Manifest
Местоположение: `/public/manifest.json`

**Конфигурация:**
```json
{
  "display": "standalone",
  "theme_color": "#2563EB",
  "background_color": "#ffffff",
  "orientation": "portrait-primary"
}
```

### Offline Queue
Местоположение: `/utils/pwa.ts`

**API:**
```typescript
const queue = new OfflineQueue();
await queue.init();
await queue.addAction({ type: 'delivery-status', ... });
const pending = await queue.getPendingActions();
await queue.markAsSynced(id);
```

## Мобильная адаптация

### Responsive Breakpoints
```css
xs: <480px    /* Мобильный */
sm: 480-768px /* Планшет вертикально */
md: 768-1024px /* Планшет горизонтально */
lg: 1024-1440px /* Десктоп */
xl: >1440px   /* Большой десктоп */
```

### Touch Targets
- Минимальный размер: **44×44px**
- Отступы между элементами: **12px**
- Удобные тач-зоны для всех интерактивных элементов

### Мобильная навигация
Компонент: `/components/MobileNav.tsx`

**Bottom Tab Bar:**
- Заказы
- Календарь
- Склад
- Поиск
- Ещё

**Автоматически скрывается на десктопе (md+)**

### Bottom Sheet
Компонент: `/components/BottomSheet.tsx`

**Функции:**
- Свайп вниз для закрытия
- Анимация появления/скрытия
- Поддержка snap points
- Touch-friendly

**Использование:**
```tsx
<BottomSheet
  isOpen={open}
  onClose={handleClose}
  title="Заказ №123"
  snapPoints={[0.5, 0.9]}
>
  {content}
</BottomSheet>
```

## Режим курьера

### Особенности
1. **Упрощённый интерфейс** - только необходимое
2. **Фокус на доставке** - маршруты, навигация, статусы
3. **Офлайн-первый** - работа без интернета
4. **Быстрые действия** - звонки, SMS, навигация

### Доступ
- Роль: `courier`
- Видит: только свои заказы на сегодня/завтра
- Не видит: закупочные цены, маржу, редактирование состава

### Workflow
1. **Список заказов** - сгруппированы по времени
2. **Детали заказа** - вкладки Инфо/Доставка
3. **Быстрые действия:**
   - Навигация → Яндекс.Карты
   - Позвонить → tel: link
   - SMS → быстрые шаблоны
4. **Статусы доставки:**
   - Назначен → В пути → Доставлено
   - Требования для "Доставлено":
     - Фото подтверждения
     - ФИО получателя
     - Геолокация (опционально)

### Офлайн-синхронизация

**Как работает:**
1. Действие сохраняется в IndexedDB
2. При появлении сети - автоматическая отправка
3. Визуальный индикатор статуса

**Что синхронизируется:**
- Изменения статусов доставки
- Фото-подтверждения
- Геолокация
- Комментарии

## Интеграция с Яндекс.Картами

### API
Местоположение: `/utils/maps.ts`

**Функции:**

```typescript
// Открыть навигацию
openInYandexMaps(address: string, lat?: number, lon?: number)

// Позвонить
makePhoneCall(phone: string)

// Отправить SMS
sendSMS(phone: string, message: string)

// Получить координаты
getCurrentLocation(): Promise<{lat, lon}>

// Геокодинг (требует API ключ)
geocodeAddress(address: string): Promise<{lat, lon} | null>
```

**Deep Links:**
```javascript
// Яндекс.Навигатор
yandexnavi://build_route_on_map?lat_to=55.7558&lon_to=37.6173

// Яндекс.Карты (приложение)
yandexmaps://maps.yandex.ru/?pt=37.6173,55.7558

// Яндекс.Карты (веб)
https://yandex.ru/maps/?text=адрес
```

**Fallback стратегия:**
1. Попытка открыть Яндекс.Навигатор
2. Попытка открыть Яндекс.Карты
3. Открыть веб-версию

## Offline Indicator

Компонент: `/components/OfflineIndicator.tsx`

**Показывает:**
- Красная полоса: нет сети
- Зелёная полоса: сеть восстановлена
- Автоматически скрывается через 3 секунды

## Дизайн-система

### Spacing Tokens (4px base)
```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-6: 24px
--space-8: 32px
```

### Status Colors
```css
--status-new: #64748B (серый)
--status-in-progress: #3B82F6 (синий)
--status-confirmed: #10B981 (зелёный)
--status-picking: #8B5CF6 (фиолетовый)
--status-en-route: #F59E0B (оранжевый)
--status-shipped: #6366F1 (индиго)
--status-delivered: #059669 (тёмно-зелёный)
--status-cancelled: #DC2626 (красный)
```

### Touch Targets
```css
--tap-target-min: 44px
```

### Safe Area (iOS notch/home indicator)
```css
padding-top: env(safe-area-inset-top, 0px);
padding-bottom: env(safe-area-inset-bottom, 0px);
```

## Установка PWA

### Android (Chrome/Edge)
1. Откройте сайт в Chrome
2. Меню (⋮) → "Установить приложение"
3. Или: баннер установки автоматически
4. Иконка появится на главном экране

### iOS (Safari)
1. Откройте сайт в Safari
2. Нажмите "Поделиться" (⬆️)
3. Прокрутите вниз → "На экран Домой"
4. Подтвердите название
5. Иконка появится на главном экране

### Desktop (Chrome/Edge)
1. Откройте сайт
2. Иконка установки в адресной строке
3. Или: Меню → "Установить..."
4. Приложение откроется в отдельном окне

## Тестирование

### Проверка PWA
```bash
# Chrome DevTools
Application → Manifest
Application → Service Workers
Lighthouse → Progressive Web App
```

### Проверка офлайн-режима
1. DevTools → Network → Offline
2. Обновите страницу - должна работать
3. Проверьте кеш в Application → Cache Storage

### Проверка адаптивности
1. DevTools → Device Toolbar
2. Протестируйте все breakpoints
3. Проверьте touch targets (Rendering → Show tap highlights)

## Производительность

### Метрики
- **TTI** (Time to Interactive): <3s на 4G
- **Bundle size**: <300KB (gzipped)
- **First Paint**: <1s

### Оптимизации
- Code splitting по роутам
- Lazy loading компонентов
- Image optimization
- CSS minification
- Tree shaking

## Безопасность

### HTTPS Required
PWA требует HTTPS для:
- Service Workers
- Geolocation
- Camera access
- Install prompts

### Permissions
- **Camera**: для фото-подтверждения
- **Geolocation**: для координат доставки
- **Notifications**: для уведомлений (будущее)

## Известные ограничения

### iOS Safari
- Нет push-уведомлений
- Ограниченная работа Service Worker
- Кеш очищается через 7 дней неактивности
- Нет background sync

### Решения
- Fallback на обычные HTTP запросы
- Локальное хранение в IndexedDB
- Периодическая синхронизация при открытии

## Будущие улучшения

- [ ] Push-уведомления (Android)
- [ ] Background sync API
- [ ] Web Share API
- [ ] Periodic background sync
- [ ] Badging API для иконки
- [ ] Shortcuts в контекстном меню
- [ ] WebRTC для видеозвонков с клиентами
