export interface User {
  id: number;
  name: string;
  age: number;
  avatarUrl: string;
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
  description?: string;
  participants?: User[];
}

export interface Place {
  id: number;
  name: string;
  offer: string;
  address: string;
  userCount: number;
  userImages: string[];
  icon: string;
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
