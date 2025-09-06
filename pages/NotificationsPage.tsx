


import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Info } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../types';

const formatRelativeTime = (createdAt: string): string => {
  const timestamp = new Date(createdAt).getTime();
  const now = new Date();
  const seconds = Math.round((now.getTime() - timestamp) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);

  if (seconds < 5) return "Lige nu";
  if (minutes < 1) return `${seconds}s siden`;
  if (minutes < 60) return `${minutes}min siden`;
  if (hours < 24) return `${hours}t siden`;
  
  const date = new Date(timestamp);
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
};

const groupNotificationsByDate = (notifications: Notification[]) => {
  const groups: { [key: string]: Notification[] } = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  notifications.forEach(notif => {
    const notifDate = new Date(notif.created_at);
    let key;
    if (notifDate.toDateString() === today.toDateString()) {
      key = 'I dag';
    } else if (notifDate.toDateString() === yesterday.toDateString()) {
      key = 'I går';
    } else {
      key = notifDate.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(notif);
  });
  return groups;
};

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  return (
    <div className={`flex items-start space-x-4 py-3 px-2 rounded-lg ${!notification.read ? 'bg-primary-light/50 dark:bg-primary/10' : ''}`}>
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
        {notification.actor ? (
          <img src={notification.actor.avatar_url} alt={notification.actor.name} className="w-full h-full rounded-full object-cover ring-1 ring-gray-200 dark:ring-dark-border" />
        ) : (
          <div className="w-12 h-12 bg-primary-light dark:bg-dark-surface-light rounded-full flex items-center justify-center text-2xl text-primary">
            <Info />
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className="text-text-primary dark:text-dark-text-primary">
          <strong className="font-bold">{notification.actor?.name}</strong> {notification.message}
        </p>
        <p className={`text-sm mt-0.5 ${notification.read ? 'text-text-secondary' : 'text-primary font-semibold'}`}>
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
    </div>
  );
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markAllAsRead, clearNotifications } = useNotifications();

  useEffect(() => {
    // Mark as read after a short delay to allow the user to see the unread state briefly.
    const timer = setTimeout(() => {
        markAllAsRead();
    }, 1000);
    return () => clearTimeout(timer);
  }, [markAllAsRead]);

  const groupedNotifications = useMemo(() => groupNotificationsByDate(notifications), [notifications]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-background">
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Notifikationer</h1>
        <button onClick={clearNotifications} className="p-2 -mr-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Ryd alle notifikationer">
          <Trash2 size={22} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {notifications.length > 0 ? (
          <div className="p-4">
            {Object.entries(groupedNotifications).map(([dateLabel, notifs]) => (
              <section key={dateLabel} className="mb-6">
                <h2 className="text-lg font-bold text-text-primary dark:text-dark-text-primary mb-2">{dateLabel}</h2>
                <div className="space-y-1">
                  {notifs.map(notification => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Ingen notifikationer</h2>
            <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Du har ingen nye notifikationer endnu. <br/> Kom igen senere!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;