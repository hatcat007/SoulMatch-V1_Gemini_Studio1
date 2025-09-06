import { Session } from '@supabase/supabase-js';

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
  is_admin?: boolean;
  auth_id?: string;
  user_traits?: UserTrait[];
  personality_tags?: PersonalityTag[];
}

export interface UserTrait {
  user_id: number;
  trait: string;
  value: number;
}

export interface ImageRecord {
  id: number;
  image_url: string;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  type: 'event' | 'place';
}

export interface Event {
  id: number;
  title: string;
  time: string;
  end_time?: string;
  participantCount: number;
  host_name: string;
  host_avatar_url: string;
  icon: string;
  color: string;
  description?: string;
  participants?: User[];
  organization_id: number;
  organization?: {
    logo_url: string;
  };
  image_url?: string;
  images?: ImageRecord[];
  address?: string;
  is_sponsored?: boolean;
  offer?: string;
  category: Category;
  category_id: number;
  creator_user_id?: number;
  interests?: Interest[];
}

export interface Place {
  id: number;
  name: string;
  offer: string;
  address: string;
  user_count: number;
  user_images: string[];
  icon: string;
  description: string;
  is_sponsored: boolean;
  phone: string;
  opening_hours: string;
  organization_id?: number;
  organization?: {
    id: number;
    name: string;
  };
  image_url?: string;
  images?: ImageRecord[];
  category: Category;
  category_id: number;
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
  card_data?: {
    type: 'event' | 'place';
    id: number;
    title: string;
    image_url?: string;
    offer?: string;
    address?: string;
  };
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
  host_name?: string;
  organization_type?: string;
  facebook_url?: string;
  emojis?: string[];
  opportunities?: OrganizationOpportunity[];
  updates?: OrganizationUpdate[];
  auth_id?: string;
}

export type NotificationType = 'message' | 'event' | 'friend_request' | 'system' | 'profile_view';

export interface Notification {
  id: number;
  user_id: number;
  actor_id: number | null;
  type: NotificationType;
  message: string;
  related_entity_id: number | null;
  read: boolean;
  created_at: string;
  // Eager-loaded on the client
  actor: User | null;
}

export interface InterestCategory {
    id: number;
    name: string;
}

export interface Interest {
    id: number;
    name: string;
    category_id: number;
}

export interface PersonalityTagCategory {
    id: number;
    name: string;
}

export interface PersonalityTag {
    id: number;
    name: string;
    category_id: number;
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

export interface UserReport {
  id: number;
  reporter_user_id: number;
  reported_user_id: number;
  reason: string;
  comment?: string;
  status: 'new' | 'under_review' | 'resolved';
  created_at: string;
}

export interface Checkin {
  id: number;
  place_id: number;
  user_id_1: number;
  user_id_2: number;
  created_at: string;
}

export interface Activity {
    id: number;
    name: string;
    icon: string;
}