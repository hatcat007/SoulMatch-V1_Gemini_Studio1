

import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../types';

const formatRelativeTime = (timestamp: number): string => {
  const now = new Date();
  const seconds = Math.round((now.getTime() - timestamp) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);

  if (seconds < 5) return "Lige nu";
  if (minutes < 60) return `${minutes}min siden`;
  if (hours < 24) return `${hours} time siden`;
  
  const date = new Date(timestamp);
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
};

const groupNotificationsByDate = (notifications: Notification[]) => {
  const groups: { [key: string]: Notification[] } = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  notifications.forEach(notif => {
    const notifDate = new Date(notif.timestamp);
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
    <div className="flex items-start space-x-4 py-3">
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
        {notification.actor ? (
          <img src={notification.actor.avatar_url} alt={notification.actor.name} className="w-full h-full rounded-full object-cover ring-1 ring-gray-200" />
        ) : (
          <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center text-2xl">
            {notification.icon}
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className="text-text-primary">
          {notification.actor && <strong className="font-bold">{notification.actor.name}</strong>} {notification.message}
        </p>
        <p className="text-sm text-text-secondary mt-0.5">
          {formatRelativeTime(notification.timestamp)}
        </p>
      </div>
    </div>
  );
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markAllAsRead, clearNotifications } = useNotifications();

  useEffect(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const groupedNotifications = useMemo(() => groupNotificationsByDate(notifications), [notifications]);

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:text-primary" aria-label="Gå tilbage">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Notifikationer</h1>
        <button onClick={clearNotifications} className="p-2 -mr-2 text-gray-600 hover:text-primary" aria-label="Ryd alle notifikationer">
          <Trash2 size={22} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {notifications.length > 0 ? (
          <div className="p-4">
            {Object.entries(groupedNotifications).map(([dateLabel, notifs]) => (
              <section key={dateLabel} className="mb-6">
                <h2 className="text-lg font-bold text-text-primary mb-2">{dateLabel}</h2>
                <div className="divide-y divide-gray-100">
                  {notifs.map(notification => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <h2 className="text-xl font-bold text-text-primary">Ingen notifikationer</h2>
            <p className="text-text-secondary mt-2">Du har ingen nye notifikationer endnu. <br/> Kom igen senere!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;