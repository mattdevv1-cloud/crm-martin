import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[]; // [0.5, 0.9] - percentage of viewport height
}

export function BottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  children,
  snapPoints = [0.5, 0.9]
}: BottomSheetProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaY = currentY - startY;
    
    // If swiped down more than 100px, close
    if (deltaY > 100) {
      onClose();
    }
    
    setIsDragging(false);
    setCurrentY(0);
    setStartY(0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[1040] md:hidden"
            style={{ touchAction: 'none' }}
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ 
              y: isDragging && currentY > startY ? currentY - startY : 0 
            }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[1050] md:hidden flex flex-col"
            style={{ 
              maxHeight: `${snapPoints[1] * 100}vh`,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              touchAction: 'none'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Handle */}
            <div className="flex items-center justify-center py-3 px-4 border-b border-gray-200">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>
            
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
