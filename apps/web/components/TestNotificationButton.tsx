'use client';

import { useNotifications } from '@/contexts/NotificationContext';

export function TestNotificationButton() {
  const { addNotification } = useNotifications();

  const testNotifications = () => {
    // Test success notification
    addNotification({
      type: 'success',
      title: '🎉 Test Win!',
      message: 'This is a test notification to verify the system works',
      game: 'coinflip',
      player: '0x1234567890abcdef1234567890abcdef12345678',
      amount: 1.5,
      multiplier: 2
    });

    // Test error notification after a delay
    setTimeout(() => {
      addNotification({
        type: 'error',
        title: '💸 Test Loss',
        message: 'This is another test notification',
        game: 'crash',
        player: '0xabcdef1234567890abcdef1234567890abcdef12',
        amount: 0.5,
        multiplier: 1.2
      });
    }, 1000);
  };

  return (
    <button
      onClick={testNotifications}
      className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg z-50 hover:bg-blue-600 transition-colors"
    >
      Test Snackbar
    </button>
  );
}