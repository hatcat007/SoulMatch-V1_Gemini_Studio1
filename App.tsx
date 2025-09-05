

import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HomePage from './pages/HomePage';
import PlacesPage from './pages/PlacesPage';
import ChatListPage from './pages/ChatListPage';
import ProfilePage from './pages/ProfilePage';
import OnboardingPage from './pages/OnboardingPage';
import BottomNav from './components/BottomNav';
import CreateEventPage from './pages/CreateEventPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ChatPage from './pages/ChatPage';
import EventDetailPage from './pages/EventDetailPage';
import PlacesFilterPage from './pages/PlacesFilterPage';
import CheckinPage from './pages/CheckinPage';
import OrganizationProfilePage from './pages/OrganizationProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import FAQPage from './pages/FAQPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import CreateOrganizationPage from './pages/CreateOrganizationPage';
import ConfirmOrganizationPage from './pages/ConfirmOrganizationPage';
import CreateProfilePage from './pages/CreateProfilePage';
import PersonalityTestPage from './pages/PersonalityTestPage';
import FriendsPage from './pages/FriendsPage';
import AdminPage from './pages/AdminPage';
import { NotificationProvider } from './contexts/NotificationContext';
import { useNotifications } from './hooks/useNotifications';
import type { NotificationType, User, Event, Place } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './services/supabase';
import LoadingScreen from './components/LoadingScreen';

import OrganizationLayout from './pages/organization/OrganizationLayout';
import OrganizationDashboardPage from './pages/organization/OrganizationDashboardPage';
import CreateOrgEventPage from './pages/organization/CreateOrgEventPage';
import CreatePlacePage from './pages/organization/CreatePlacePage';
import ImportEventPage from './pages/organization/ImportEventPage';
import OrganizationSettingsPage from './pages/organization/OrganizationSettingsPage';
import EditOrgEventPage from './pages/organization/EditOrgEventPage';
import EditPlacePage from './pages/organization/EditPlacePage';

const MockNotificationGenerator: React.FC = () => {
  const { addNotification } = useNotifications();

  React.useEffect(() => {
    const mockUsers: User[] = [
        { id: 101, name: 'Patrick', age: 28, avatar_url: 'https://i.pravatar.cc/80?u=101', online: true },
        { id: 102, name: 'Johanne', age: 25, avatar_url: 'https://i.pravatar.cc/80?u=102', online: false },
        { id: 103, name: 'Anne', age: 24, avatar_url: 'https://i.pravatar.cc/80?u=103', online: true },
        { id: 104, name: 'Chris', age: 30, avatar_url: 'https://i.pravatar.cc/80?u=104', online: false },
    ];

    const mockNotifs: { message: string; type: NotificationType; actor?: User; icon?: string; timestamp?: number }[] = [
      { message: 'Event starter om 15min 🥳', type: 'event', icon: '🎸', timestamp: Date.now() - (5 * 1000) },
      { message: '👀 på din profil', type: 'profile_view', actor: mockUsers[0], timestamp: Date.now() - (10 * 1000) },
      { message: '👀 på din profil', type: 'profile_view', actor: mockUsers[1], timestamp: Date.now() - (2 * 60 * 1000) },
      { message: 'sendte dig en besked', type: 'message', actor: mockUsers[2], timestamp: Date.now() - (15 * 60 * 1000) },
      { message: 'sendte en venneanmodning', type: 'friend_request', actor: mockUsers[3], timestamp: Date.now() - (1 * 60 * 60 * 1000) },
    ];

    const interval = setInterval(() => {
      const randomNotif = mockNotifs[Math.floor(Math.random() * mockNotifs.length)];
      addNotification({ ...randomNotif, timestamp: Date.now() });
    }, 30000); // Add a new notification every 30 seconds

    return () => clearInterval(interval);
  }, [addNotification]);

  return null;
};

const AppContent: React.FC = () => {
  const { session, user, organization, loading: authLoading, refetchUserProfile } = useAuth();
  
  // Centralized state for shared page data to prevent re-fetching on navigation
  const [events, setEvents] = useState<Event[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  const fetchPageData = useCallback(async () => {
    setDataLoading(true);
    
    const eventsPromise = supabase
        .from('events')
        .select(`*, organization:organizations(logo_url), event_participants ( count ), category:categories(*)`);
    const onlineUsersPromise = supabase
        .from('users').select('*').eq('online', true).limit(10);
    const placesPromise = supabase.from('places').select('*, images:place_images(id, image_url), organization:organizations(id, name), category:categories(*)');

    const [eventsRes, usersRes, placesRes] = await Promise.all([eventsPromise, onlineUsersPromise, placesPromise]);

    if (eventsRes.error) console.error('Error fetching events:', eventsRes.error);
    else setEvents(eventsRes.data.map(e => ({ ...e, participantCount: e.event_participants?.[0]?.count || 0 })) as Event[]);
    
    if (usersRes.error) console.error('Error fetching online users:', usersRes.error);
    else setOnlineUsers(usersRes.data || []);

    if (placesRes.error) console.error('Error fetching places:', placesRes.error);
    else setPlaces((placesRes.data || []) as Place[]);

    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (user && !organization) {
      fetchPageData();
    } else if (!authLoading) {
      // If there's no user or it's an org, and we're not authenticating, no page data to load.
      setDataLoading(false);
    }
  }, [user, organization, authLoading, fetchPageData]);

  // Centralized realtime subscriptions
  useEffect(() => {
      if (!user) return;

      const fetchEvents = async () => {
          const { data: eventsData } = await supabase.from('events').select(`*, organization:organizations(logo_url), event_participants ( count ), category:categories(*)`);
          if (eventsData) setEvents(eventsData.map(e => ({ ...e, participantCount: e.event_participants?.[0]?.count || 0 })) as Event[]);
      };

      const fetchPlaces = async () => {
          const { data: placesData } = await supabase.from('places').select('*, images:place_images(id, image_url), organization:organizations(id, name), category:categories(*)');
          if (placesData) setPlaces((placesData || []) as Place[]);
      };
      
      const eventsChannel = supabase.channel('realtime events')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, fetchEvents)
          .subscribe();
          
      const placesChannel = supabase.channel('realtime places')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'places' }, fetchPlaces)
          .subscribe();

      return () => {
          supabase.removeChannel(eventsChannel);
          supabase.removeChannel(placesChannel);
      };
  }, [user]);

  const isUser = session && user;
  const isOrganization = session && organization;
  
  // Unified loading state
  const isLoading = authLoading || (isUser && !isOrganization && dataLoading);

  const needsUserProfile = session && !user && !organization && !session.user.user_metadata?.is_organization;
  const needsPersonalityTest = isUser && !user.personality_test_completed;

  const handleActionComplete = () => {
    refetchUserProfile();
  };

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <LoadingScreen key="loader" fullScreen />
      ) : (
        <motion.div
          key="content"
          className="h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {(() => {
            if (isOrganization) {
              return (
                <OrganizationLayout>
                  <Routes>
                    <Route path="/dashboard" element={<OrganizationDashboardPage />} />
                    <Route path="/create-event" element={<CreateOrgEventPage />} />
                    <Route path="/edit-event/:eventId" element={<EditOrgEventPage />} />
                    <Route path="/import-event" element={<ImportEventPage />} />
                    <Route path="/create-place" element={<CreatePlacePage />} />
                    <Route path="/edit-place/:placeId" element={<EditPlacePage />} />
                    <Route path="/settings" element={<OrganizationSettingsPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </OrganizationLayout>
              );
            }
  
            if (isUser) {
              if (needsPersonalityTest) {
                return <PersonalityTestPage onTestComplete={handleActionComplete} />;
              }
              
              return (
                <div className="md:flex h-screen w-full">
                  <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
                    <Routes>
                      <Route path="/home" element={<HomePage events={events} onlineUsers={onlineUsers} />} />
                      <Route path="/places" element={<PlacesPage places={places} />} />
                      <Route path="/create" element={<CreateEventPage />} />
                      <Route path="/chat" element={<ChatListPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/chat/:chatId" element={<ChatPage />} />
                      <Route path="/event/:eventId" element={<EventDetailPage />} />
                      <Route path="/places/filter" element={<PlacesFilterPage />} />
                      <Route path="/checkin" element={<CheckinPage />} />
                      <Route path="/organization/:organizationId" element={<OrganizationProfilePage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/faq" element={<FAQPage />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsOfServicePage />} />
                      <Route path="/friends" element={<FriendsPage />} />
                      {user.is_admin && <Route path="/admin" element={<AdminPage />} />}
                      <Route path="*" element={<Navigate to="/home" replace />} />
                    </Routes>
                  </div>
                  <BottomNav />
                </div>
              );
            }
  
            if (needsUserProfile) {
              return <CreateProfilePage onProfileCreated={handleActionComplete} />;
            }
  
            // Public routes for unauthenticated users
            return (
              <Routes>
                <Route path="/" element={<OnboardingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/create-organization" element={<CreateOrganizationPage />} />
                <Route path="/confirm-organization" element={<ConfirmOrganizationPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <NotificationProvider>
      <MockNotificationGenerator />
      <AuthProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </AuthProvider>
    </NotificationProvider>
  </ThemeProvider>
);

export default App;