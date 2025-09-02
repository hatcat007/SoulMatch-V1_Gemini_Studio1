
import React, { useEffect, useState } from 'react';
// FIX: Added `Eye` icon for profile view notifications.
import { X, MessageSquare, Calendar, UserPlus, Info, Eye } from 'lucide-react';
import type { ToastNotification, } from '../contexts/NotificationContext';
import type { NotificationType } from '../types';

interface ToastProps {
  toast: ToastNotification;
  onClose: (id: number) => void;
}

// FIX: Added `profile_view` to handle all notification types.
const ICONS: Record<NotificationType, React.ReactNode> = {
    message: <MessageSquare className="h-6 w-6 text-blue-500" />,
    event: <Calendar className="h-6 w-6 text-green-500" />,
    friend_request: <UserPlus className="h-6 w-6 text-purple-500" />,
    system: <Info className="h-6 w-6 text-gray-500" />,
    profile_view: <Eye className="h-6 w-6 text-indigo-500" />,
};

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setVisible(true);

    const timer = setTimeout(() => {
      handleClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    // Wait for animation to finish before removing from DOM
    setTimeout(() => onClose(toast.toastId), 300); 
  };
  
  const icon = ICONS[toast.type] || <Info className="h-6 w-6 text-gray-500" />;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`w-full max-w-sm bg-white rounded-xl shadow-2xl flex items-start p-4 space-x-3 transition-all duration-300 ease-in-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">{toast.message}</p>
        </div>
        <button 
            onClick={handleClose} 
            className="p-1 -m-1 text-gray-400 hover:text-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close notification"
        >
            <X size={18} />
        </button>
    </div>
  );
};

export default Toast;
