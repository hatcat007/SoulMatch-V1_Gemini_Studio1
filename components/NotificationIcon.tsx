import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationIcon: React.FC = () => {
  const { unreadCount } = useNotifications();

  return (
    <Link 
      to="/notifications"
      className="relative p-2 text-gray-600 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary-dark rounded-full"
      aria-label={`Notifications (${unreadCount} unread)`}
    >
      <Bell size={24} />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 block h-5 w-5 transform -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
};

export default NotificationIcon;