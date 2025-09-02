export interface User {
  id: number;
  name: string;
  age: number;
  avatarUrl?: string;
  online: boolean;
}

export interface Event {
  id: number;
  title: string;
  time: string;
  participantCount: number;
  host: string;
  hostAvatarUrl: string;
  icon: string;
  color: string;
  category: string;
  description?: string;
  participants?: User[];
  organizationId: number;
}

export interface Place {
  id: number;
  name: string;
  offer: string;
  address: string;
  userCount: number;
  userImages: string[];
  icon: string;
  category: string;
  description: string;
  isSponsored: boolean;
  phone: string;
  openingHours: string;
}

export interface MessageThread {
  id: number;
  user: User;
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
  logoUrl: string;
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