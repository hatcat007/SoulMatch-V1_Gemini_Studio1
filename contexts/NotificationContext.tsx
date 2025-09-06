import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { Notification, NotificationType, User } from '../types';
import Toast from '../components/Toast';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

export interface ToastNotification extends Notification {
  toastId: number;
  // The original Notification type from the DB has created_at (string),
  // but the Toast and other UI components use timestamp (number). We'll add it here.
  timestamp: number; 
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial notifications
  useEffect(() => {
    if (user) {
      setLoading(true);
      supabase
        .from('notifications')
        .select('*, actor:users!notifications_actor_id_fkey(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching notifications:", error);
          } else {
            setNotifications(data as Notification[] || []);
          }
          setLoading(false);
        });
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [user]);
  
  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`notifications:${user.id}`)
      .on<Notification>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          // The payload doesn't have the joined 'actor' data, so we fetch the full notification.
          const { data: fullNotif, error } = await supabase
            .from('notifications')
            .select('*, actor:users!notifications_actor_id_fkey(*)')
            .eq('id', payload.new.id)
            .single();
            
          if (error) {
            console.error("Error fetching full notification:", error);
            return;
          }
          if (fullNotif) {
            // Add to main list
            setNotifications(prev => [fullNotif as Notification, ...prev]);
            
            // Show a toast
            const newToast: ToastNotification = {
              ...(fullNotif as Notification),
              toastId: Date.now() + Math.random(),
              timestamp: new Date(fullNotif.created_at).getTime(),
            };
            setToasts(prev => [newToast, ...prev].slice(0, 5));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const removeToast = useCallback((toastId: number) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user || notifications.filter(n => !n.read).length === 0) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    // Update database
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    
    if (error) {
        console.error("Error marking notifications as read:", error);
        // Note: No explicit revert here to avoid UI flicker. The next fetch will correct it.
    }
  }, [user, notifications]);

  const clearNotifications = useCallback(async () => {
    if (!user || notifications.length === 0) return;
    
    // Optimistic UI update
    const oldNotifications = notifications;
    setNotifications([]);

    // Update database
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
    
    if (error) {
      // Revert on error
      setNotifications(oldNotifications);
      console.error("Error clearing notifications:", error);
    }
  }, [user, notifications]);

  const value = {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
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