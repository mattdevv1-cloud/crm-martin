import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BottomSheet } from './BottomSheet';
import {
  Navigation,
  Phone,
  MessageSquare,
  Camera,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface Order {
  id: number;
  number: string;
  customerName: string;
  customerPhone: string;
  address?: string;
  deliveryDate?: string;
  deliverySlot?: string;
  total: number;
  deliveryStatus?: string;
  courierComment?: string;
  deliveredAt?: string;
  recipientName?: string;
  proofPhotoUrl?: string;
}

interface CourierBottomSheetProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  onNavigate: () => void;
  onCall: () => void;
  onSendMessage: (template: string) => void;
  onUpdateStatus: (status: string) => void;
  proofPhoto: string | null;
  recipientName: string;
  onRecipientNameChange: (value: string) => void;
  onPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  updating: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  getDeliveryStatusBadge: (status: string) => JSX.Element;
}

export function CourierBottomSheet({
  order,
  open,
  onClose,
  onNavigate,
  onCall,
  onSendMessage,
  onUpdateStatus,
  proofPhoto,
  recipientName,
  onRecipientNameChange,
  onPhotoCapture,
  updating,
  fileInputRef,
  getDeliveryStatusBadge,
}: CourierBottomSheetProps) {
  const [activeTab, setActiveTab] = React.useState('info');

  return (
    <BottomSheet isOpen={open} onClose={onClose} title={order.number}>
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-2 px-4 ${
              activeTab === 'info'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            Информация
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`pb-2 px-4 ${
              activeTab === 'delivery'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            Доставка
          </button>
        </div>

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Клиент</div>
              <div className="font-medium">{order.customerName}</div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Телефон</div>
              <div className="font-medium">{order.customerPhone}</div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Адрес</div>
              <div>{order.address}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Дата</div>
                <div>
                  {order.deliveryDate && new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Время</div>
                <div>{order.deliverySlot || '—'}</div>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Сумма к получению</div>
              <div className="text-2xl font-bold text-blue-600">
                {order.total?.toFixed(2)} BYN
              </div>
            </div>

            {order.courierComment && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Комментарий курьеру</div>
                <div className="text-sm bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  {order.courierComment}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t">
              <Button
                onClick={onNavigate}
                variant="outline"
                className="flex-col h-auto py-3"
              >
                <Navigation className="h-5 w-5 mb-1" />
                <span className="text-xs">Маршрут</span>
              </Button>
              <Button
                onClick={onCall}
                variant="outline"
                className="flex-col h-auto py-3"
              >
                <Phone className="h-5 w-5 mb-1" />
                <span className="text-xs">Позвонить</span>
              </Button>
              <Button
                onClick={() => onSendMessage('Здравствуйте! Я курьер, скоро буду.')}
                variant="outline"
                className="flex-col h-auto py-3"
              >
                <MessageSquare className="h-5 w-5 mb-1" />
                <span className="text-xs">SMS</span>
              </Button>
            </div>
          </div>
        )}

        {/* Delivery Tab */}
        {activeTab === 'delivery' && (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-2">Текущий статус</div>
              <div className="flex items-center gap-2">
                {getDeliveryStatusBadge(order.deliveryStatus || 'assigned')}
                {order.deliveredAt && (
                  <span className="text-xs text-gray-500">
                    {new Date(order.deliveredAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Status Flow */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 ${
                  order.deliveryStatus ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    order.deliveryStatus ? 'bg-green-100' : 'bg-gray-200'
                  }`}>
                    1
                  </div>
                  <span className="text-sm">Назначен</span>
                </div>
                <div className="flex-1 h-0.5 bg-gray-300 mx-2" />
                <div className={`flex items-center gap-2 ${
                  order.deliveryStatus === 'en_route' || order.deliveryStatus === 'delivered' 
                    ? 'text-orange-600' 
                    : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    order.deliveryStatus === 'en_route' || order.deliveryStatus === 'delivered'
                      ? 'bg-orange-100' 
                      : 'bg-gray-200'
                  }`}>
                    2
                  </div>
                  <span className="text-sm">В пути</span>
                </div>
                <div className="flex-1 h-0.5 bg-gray-300 mx-2" />
                <div className={`flex items-center gap-2 ${
                  order.deliveryStatus === 'delivered' ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    order.deliveryStatus === 'delivered' ? 'bg-green-100' : 'bg-gray-200'
                  }`}>
                    3
                  </div>
                  <span className="text-sm">Доставлено</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {(!order.deliveryStatus || order.deliveryStatus === 'assigned') && (
                <Button
                  onClick={() => onUpdateStatus('en_route')}
                  disabled={updating}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  style={{ minHeight: '44px' }}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Начать доставку
                </Button>
              )}

              {order.deliveryStatus === 'en_route' && (
                <>
                  <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Подтверждение доставки</span>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        ФИО получателя *
                      </label>
                      <Input
                        value={recipientName}
                        onChange={(e) => onRecipientNameChange(e.target.value)}
                        placeholder="Иванов Иван Иванович"
                        className="bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Фото подтверждения *
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={onPhotoCapture}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="w-full bg-white"
                        style={{ minHeight: '44px' }}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {proofPhoto ? '✓ Фото загружено' : 'Сделать фото'}
                      </Button>
                      {proofPhoto && (
                        <div className="mt-2 relative">
                          <img 
                            src={proofPhoto} 
                            alt="Proof" 
                            className="rounded-lg w-full border-2 border-green-300" 
                          />
                          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                            ✓ Готово
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => onUpdateStatus('delivered')}
                    disabled={updating || !proofPhoto || !recipientName}
                    className="w-full bg-green-600 hover:bg-green-700"
                    style={{ minHeight: '44px' }}
                  >
                    {updating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Доставлено
                  </Button>

                  <Button
                    onClick={() => onUpdateStatus('failed')}
                    disabled={updating}
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50"
                    style={{ minHeight: '44px' }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Не доставлено
                  </Button>
                </>
              )}

              {order.deliveryStatus === 'delivered' && order.recipientName && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 mb-3">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Заказ доставлен</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Получатель: </span>
                      <span className="font-medium">{order.recipientName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Время: </span>
                      <span className="font-medium">
                        {order.deliveredAt && new Date(order.deliveredAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  {order.proofPhotoUrl && (
                    <img 
                      src={order.proofPhotoUrl} 
                      alt="Proof" 
                      className="mt-3 rounded-lg w-full border border-green-300" 
                    />
                  )}
                </div>
              )}

              {order.deliveryStatus === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Доставка не выполнена</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Свяжитесь с менеджером для переноса доставки
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
