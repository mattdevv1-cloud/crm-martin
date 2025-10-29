// PWA utilities

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  if (confirm('Доступна новая версия приложения. Обновить?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    });
  }
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function checkOnlineStatus(): boolean {
  return navigator.onLine;
}

export function listenToOnlineStatus(callback: (isOnline: boolean) => void) {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Persistent storage: ${isPersisted}`);
    return isPersisted;
  }
  return false;
}

// IndexedDB for offline queue
export class OfflineQueue {
  private dbName = 'crm-offline-queue';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('actions')) {
          db.createObjectStore('actions', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async addAction(action: any) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      const request = store.add({
        ...action,
        timestamp: Date.now(),
        synced: false,
      });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions() {
    if (!this.db) await this.init();
    
    return new Promise<any[]>((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readonly');
      const store = transaction.objectStore('actions');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const actions = request.result.filter((a: any) => !a.synced);
        resolve(actions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(id: number) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}
