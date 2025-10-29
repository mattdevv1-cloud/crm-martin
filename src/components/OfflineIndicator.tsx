import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listenToOnlineStatus } from '../utils/pwa';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const cleanup = listenToOnlineStatus((online) => {
      setIsOnline(online);
      setShowNotification(true);
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    });

    return cleanup;
  }, []);

  return (
    <AnimatePresence>
      {(showNotification || !isOnline) && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-[1070] ${
            isOnline 
              ? 'bg-green-600' 
              : 'bg-orange-600'
          } text-white px-4 py-3 text-center text-sm font-medium shadow-lg`}
          style={{ 
            paddingTop: 'max(12px, env(safe-area-inset-top, 0px))'
          }}
        >
          <div className="flex items-center justify-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4" />
                <span>Соединение восстановлено</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Нет подключения к интернету</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
