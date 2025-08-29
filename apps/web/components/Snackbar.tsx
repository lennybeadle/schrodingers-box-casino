'use client';

import { useNotifications, Notification } from '@/contexts/NotificationContext';
import { useEffect, useState } from 'react';

const gameIcons = {
  coinflip: '🪙',
  revolver: '🎯',
  crash: '🏍️'
};

const typeIcons = {
  success: '✅',
  error: '❌',
  info: 'ℹ️'
};

function SnackbarItem({ notification, onRemove }: { 
  notification: Notification; 
  onRemove: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 50);
  }, []);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(notification.id), 300);
  };


  return (
    <div 
      className={`transform transition-all duration-300 ease-out cursor-pointer ${
        isVisible && !isExiting 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      }`}
      onClick={handleRemove}
    >
      <div className="text-sm text-gray-900 dark:text-gray-100 mb-2">
        <span className="mr-2">{notification.game ? gameIcons[notification.game] : typeIcons[notification.type]}</span>
        <span className="font-medium">{notification.title.replace(/[🎉💸🏍️💥🎯💀🪙✅❌ℹ️]/g, '').trim()}</span>
        <span className="mx-2">•</span>
        <span>{notification.message.replace(/[🎉💸🏍️💥🎯💀🪙✅❌ℹ️]/g, '').trim()}</span>
        {notification.player && (
          <>
            <span className="mx-2">•</span>
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
              {notification.player.substring(0, 6)}...{notification.player.substring(notification.player.length - 4)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function SnackbarContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <>
      {/* Desktop positioning - Bottom Left */}
      <div className="hidden md:block fixed bottom-4 left-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <SnackbarItem 
            key={notification.id} 
            notification={notification} 
            onRemove={removeNotification}
          />
        ))}
      </div>

      {/* Mobile positioning - Top full width */}
      <div className="md:hidden fixed top-4 left-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <SnackbarItem 
            key={notification.id} 
            notification={notification} 
            onRemove={removeNotification}
          />
        ))}
      </div>
    </>
  );
}