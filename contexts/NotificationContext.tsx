import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { Notification, NotificationType, User } from '../types';
import Toast from '../components/Toast';

export interface ToastNotification extends Notification {
  toastId: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (data: { message: string; type: NotificationType; actor?: User; icon?: string; timestamp?: number }) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATIONS_STORAGE_KEY = 'soulmatch_notifications';

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize notifications from localStorage or as an empty array
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const storedNotifications = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return storedNotifications ? JSON.parse(storedNotifications) : [];
    } catch (error) {
      console.error("Error reading notifications from localStorage:", error);
      return [];
    }
  });
  
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Persist notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error("Error saving notifications to localStorage:", error);
    }
  }, [notifications]);

  const addNotification = useCallback((data: { message: string; type: NotificationType; actor?: User; icon?: string; timestamp?: number }) => {
    const newNotification: Notification = {
      ...data,
      id: Date.now() + Math.random(),
      timestamp: data.timestamp || Date.now(),
      read: false,
    };
    
    // Add to main notification list and keep it sorted
    setNotifications(prev => [newNotification, ...prev].sort((a, b) => b.timestamp - a.timestamp));

    // Create and show a temporary toast
    const newToast: ToastNotification = {
      ...newNotification,
      toastId: Date.now() + Math.random(),
    };
    setToasts(prev => [newToast, ...prev].slice(0, 5)); // Limit to 5 visible toasts
  }, []);

  const removeToast = useCallback((toastId: number) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    addNotification,
    markAllAsRead,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div 
        aria-live="assertive"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[100] w-full max-w-sm flex flex-col items-end space-y-2"
      >
        {toasts.map((toast) => (
          <Toast key={toast.toastId} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};