
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import EventFilterPage from './pages/EventFilterPage';
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
import type { NotificationType, User } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

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
  const { session, user, organization, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const isUser = session && user;
  const isOrganization = session && organization;
  const needsUserProfile = session && !user && !organization && !session.user.user_metadata?.is_organization;
  const needsPersonalityTest = isUser && !user.personality_test_completed;

  const handleActionComplete = () => {
    // A simple reload is the most robust way to ensure the context picks up all changes.
    window.location.hash = '/';
    window.location.reload();
  };

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
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/home" element={<HomePage />} />
            <Route path="/places" element={<PlacesPage />} />
            <Route path="/create" element={<CreateEventPage />} />
            <Route path="/chat" element={<ChatListPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/chat/:chatId" element={<ChatPage />} />
            <Route path="/event/:eventId" element={<EventDetailPage />} />
            <Route path="/home/filter" element={<EventFilterPage />} />
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
