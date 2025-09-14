import type { Session } from '@supabase/supabase-js';

// This file centralizes all TypeScript types for the application.

// ========= AUTH & USERS =========

export interface User {
  id: number;
  auth_id?: string;
  name: string;
  age: number;
  location?: string;
  bio?: string;
  avatar_url?: string;
  personality_type?: string;
  personality_test_completed?: boolean;
  online?: boolean;
  is_admin?: boolean;
  interests?: Interest[];
  personality_tags?: PersonalityTag[];
  personality_dimensions?: UserPersonalityDimension[];
  email?: string;
  email_notifications_new_message?: boolean;
  email_notifications_new_event?: boolean;
}

export interface Organization {
  id: number;
  auth_id: string;
  name: string;
  logo_url?: string;
  address?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  organization_type?: string;
  facebook_url?: string;
  host_name?: string;
  host_avatar_url?: string;
  emojis?: string[];
  activities?: { activity: Activity }[];
}

// ========= TAGS & CATEGORIES =========

export interface Category {
  id: number;
  name: string;
  type: 'event' | 'place';
  parent_id?: number | null;
}

export interface InterestCategory {
  id: number;
  name: string;
}

export interface Interest {
  id: number;
  name: string;
  category_id: number;
  approved?: boolean;
}

export interface Activity {
  id: number;
  name: string;
  icon: string;
  approved?: boolean;
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

// ========= CORE ENTITIES =========

export interface Event {
  id: number;
  title: string;
  description: string;
  time: string;
  end_time?: string;
  address: string;
  image_url?: string;
  icon?: string;
  color?: string;
  category_id: number;
  category?: Category;
  organization_id?: number;
  organization?: Organization;
  creator_user_id?: number;
  creator?: User;
  host_name?: string;
  host_avatar_url?: string;
  is_sponsored?: boolean;
  offer?: string;
  images?: ImageRecord[];
  interests?: { interest: Interest }[];
  event_activities?: { activity: Activity }[];
  participantCount?: number; // From frontend transformation
  participants?: { count: number }[]; // From DB query
  is_diagnosis_friendly?: boolean;
  message_thread?: { id: number };
}

export interface Place {
  id: number;
  name: string;
  description: string;
  address: string;
  image_url?: string;
  icon?: string;
  offer?: string;
  category_id: number;
  category?: Category;
  organization_id: number;
  organization?: Organization;
  latitude?: number;
  longitude?: number;
  is_sponsored?: boolean;
  is_certified?: boolean;
  phone?: string;
  opening_hours?: string;
  user_count: number;
  images?: ImageRecord[];
  place_activities?: { activity: Activity }[];
  place_interests?: { interest: Interest }[];
}

export interface ImageRecord {
  id: number;
  image_url: string;
}

// ========= MESSAGING & SOCIAL =========

export interface Message {
  id: number;
  thread_id: string;
  sender_id: number;
  text: string;
  image_url?: string;
  created_at: string;
  card_data?: {
      type: 'event' | 'place';
      id: number;
      title: string;
      image_url?: string;
      address?: string;
      offer?: string;
  } | null;
}

export interface MessageThread {
  id: string;
  is_event_chat?: boolean;
  event?: { id: number; title: string };
  last_message: string;
  timestamp: string;
  unread_count: number;
  participants: { user: User }[];
  match_timestamp?: string;
}

export interface DropInInvitation {
  id: number;
  creator_user_id: number;
  creator: User;
  message: string;
  location_name: string;
  activity_icon: string;
  expires_at: string;
  created_at: string;
}

export interface Friendship {
  id: number;
  user_id_1: number;
  user_id_2: number;
  status: 'pending' | 'accepted';
  action_user_id: number;
}

export type FriendshipStatus = 'accepted' | 'pending' | 'not_friends';


// ========= PERSONALITY & AI =========

export interface UserPersonalityDimension {
  id: number;
  user_id: number;
  dimension: 'EI' | 'SN' | 'TF' | 'JP';
  dominant_trait: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';
  score: number;
  description: string;
}

export interface UserAiDescription {
  id: number;
  user_id: number;
  description: string;
  created_at: string;
}


// ========= ORGANIZATION SPECIFIC =========

export interface OrganizationOpportunity {
    name: string;
    icon: string;
}
export interface OrganizationUpdate {
    id: number;
    image_url: string;
}

// ========= NOTIFICATIONS =========

export type NotificationType = 'message' | 'event' | 'friend_request' | 'system' | 'profile_view' | 'calendar';

export interface Notification {
  id: number;
  user_id: number;
  actor_id: number | null;
  type: NotificationType;
  message: string;
  related_entity_id: number | null;
  read: boolean;
  created_at: string;
  actor: User | null;
}


// ========= MISC & SETTINGS =========

export interface GoogleCalendarSettings {
    connected: boolean;
    email?: string;
    calendars?: { id: string; summary: string }[];
    selectedCalendar?: string;
    accessToken?: string;
    refreshToken?: string;
    expiry?: number;
}


// These types were causing errors due to being defined in-place.
// Defining them here provides a single source of truth.
export interface EventWithParticipants extends Event {
  participant_count: number;
}

export interface PlaceWithCheckins extends Place {
  checkin_count: number;
}

export interface PendingInterest extends Interest {
    organization: { name: string } | null;
}
export interface PendingActivity extends Activity {
    organization: { name: string } | null;
}