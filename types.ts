export interface User {
  id: number;
  name: string;
  age: number;
  avatar_url?: string;
  online: boolean;
  bio?: string;
  location?: string;
  personality_type?: string;
}

export interface Event {
  id: number;
  title: string;
  time: string;
  participantCount: number;
  host_name: string;
  host_avatar_url: string;
  icon: string;
  color: string;
  category: string;
  description?: string;
  participants?: User[];
  organization_id: number;
}

export interface Place {
  id: number;
  name: string;
  offer: string;
  address: string;
  icon: string;
  category: string;
  description: string;
  is_sponsored: boolean;
  phone: string;
  opening_hours: string;
}

export interface MessageThread {
  id: number;
  user: User;
  userId: number;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  matchTimestamp?: number;
}

export interface Message {
  id: number;
  text: string;
  timestamp: string;
  senderId: number;
  imageUrl?: string;
}

export interface Organization {
  id: number;
  name: string;
  logo_url: string;
  address: string;
  description: string;
  opportunities: {
    name: string;
    icon: string;
  }[];
  updates: {
    id: number;
    imageUrl: string;
  }[];
  phone?: string;
  email?: string;
  website?: string;
}

export type NotificationType = 'message' | 'event' | 'friend_request' | 'system' | 'profile_view';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  timestamp: number;
  read: boolean;
  actor?: User;
  icon?: string;
}