export interface User {
  id: number;
  name: string;
  age: number;
  avatar_url?: string;
  online: boolean;
  bio?: string;
  location?: string;
  personality_type?: string;
  emojis?: string[] | null;
  personality_test_completed?: boolean;
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
  user_count: number;
  user_images: string[];
  icon: string;
  category: string;
  description: string;
  is_sponsored: boolean;
  phone: string;
  opening_hours: string;
}

export interface MessageThread {
  id: number | string;
  last_message: string;
  timestamp: string;
  unread_count: number;
  match_timestamp?: string;
  participants: { user: User }[];
}

export interface Message {
  id: number | string;
  text: string;
  created_at: string;
  sender_id: number;
  image_url?: string;
  thread_id: number | string;
}

export interface OrganizationOpportunity {
    name: string;
    icon: string;
}

export interface OrganizationUpdate {
    id: number;
    image_url: string;
}

export interface Organization {
  id: number;
  name: string;
  logo_url: string;
  address: string;
  description: string;
  phone?: string;
  email?: string;
  website?: string;
  opportunities?: OrganizationOpportunity[];
  updates?: OrganizationUpdate[];
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

export interface Interest {
    id: number;
    name: string;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
  id: number;
  user_id_1: number;
  user_id_2: number;
  status: FriendshipStatus;
  action_user_id: number;
  // Eager-loaded user profiles for easier display
  user1?: User;
  user2?: User;
}