

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
import type { NotificationType, User, Organization } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { supabase } from './services/supabase';
import type { Session } from '@supabase/supabase-js';

import OrganizationLayout from './pages/organization/OrganizationLayout';
import OrganizationDashboardPage from './pages/organization/OrganizationDashboardPage';
import CreateOrgEventPage from './pages/organization/CreateOrgEventPage';
import CreatePlacePage from './pages/organization/CreatePlacePage';

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
      { message: 'sendte en venneanmodning', type: 'friend_request', actor: { id: 105, name: 'Maria', age: 27, avatar_url: 'https://i.pravatar.cc/80?u=105', online: true }, timestamp: new Date('2023-01-12T10:30:00').getTime() },
    ];
    
    mockNotifs.forEach(notif => addNotification(notif));

    const newNotifTemplates = [
        { message: 'Nyt event: "Brætspil aften"!', type: 'event' as const, icon: '🎲' },
        { message: 'vil gerne være din ven.', type: 'friend_request' as const, actor: { id: 110, name: 'Alex', age: 29, avatar_url: 'https://i.pravatar.cc/80?u=110', online: true }},
    ];

    let i = 0;
    const interval = setInterval(() => {
        const notif = newNotifTemplates[i % newNotifTemplates.length];
        addNotification(notif);
        i++;
    }, 25000);

    return () => clearInterval(interval);
  }, []); // Eslint-disable-line react-hooks/exhaustive-deps - only run once on mount

  return null;
};

const MainAppRoutes: React.FC<{ onTestComplete: () => void }> = ({ onTestComplete }) => (
    <NotificationProvider>
      <div className="relative md:flex max-w-7xl mx-auto">
        <BottomNav />
        <main className="flex-1 min-w-0">
          <div className="h-screen overflow-y-auto bg-white dark:bg-dark-surface md:shadow-lg pb-16 md:pb-0">
              <Routes>
                <Route path="/" element={<Navigate to="/home" />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/home/filter" element={<EventFilterPage />} />
                <Route path="/places" element={<PlacesPage />} />
                <Route path="/places/filter" element={<PlacesFilterPage />} />
                <Route path="/create" element={<CreateEventPage />} />
                <Route path="/chat" element={<ChatListPage />} />
                <Route path="/chat/:chatId" element={<ChatPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/event/:eventId" element={<EventDetailPage />} />
                <Route path="/organization/:organizationId" element={<OrganizationProfilePage />} />
                <Route path="/checkin" element={<CheckinPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/personality-test" element={<PersonalityTestPage onTestComplete={onTestComplete} />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/home" />} />
              </Routes>
          </div>
        </main>
      </div>
      <MockNotificationGenerator />
    </NotificationProvider>
);

const OrganizationRoutes: React.FC = () => (
    <OrganizationLayout>
        <Routes>
            <Route path="/dashboard" element={<OrganizationDashboardPage />} />
            <Route path="/create-event" element={<CreateOrgEventPage />} />
            <Route path="/create-place" element={<CreatePlacePage />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    </OrganizationLayout>
);


const AppContent: React.FC = () => {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<User | null>(null);
  const [organization, setOrganization] = React.useState<Organization | null>(null);
  const [checkingProfile, setCheckingProfile] = React.useState(true);
  const [refreshProfileToggle, setRefreshProfileToggle] = React.useState(false);
  const [testJustCompleted, setTestJustCompleted] = React.useState(false);
  const navigate = useNavigate();

  const handleStateRefresh = () => {
    setCheckingProfile(true);
    setRefreshProfileToggle(prev => !prev);
  };

  const handleTestComplete = () => {
    setTestJustCompleted(true);
    handleStateRefresh();
  };

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    if (loading) return;

    const checkUserProfile = async () => {
      if (session) {
        setCheckingProfile(true);

        // The metadata check can be unreliable immediately after signup.
        // Querying the database directly is more robust.
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('auth_id', session.user.id)
          .single();

        if (orgData) {
          // Found an organization profile, so this is an org user.
          setOrganization(orgData as Organization);
          setProfile(null);
          setCheckingProfile(false);
        } else {
          // No org profile, check for a regular user profile.
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', session.user.id)
            .single();

          setProfile(userData ? (userData as User) : null);
          setOrganization(null);
          setCheckingProfile(false);
        }
      } else {
        setProfile(null);
        setOrganization(null);
        setCheckingProfile(false);
      }
    };

    checkUserProfile();
  }, [session, loading, refreshProfileToggle]);


  React.useEffect(() => {
    if (testJustCompleted && profile?.personality_test_completed) {
      navigate('/profile');
      setTestJustCompleted(false);
    }
  }, [testJustCompleted, profile, navigate]);

  if (loading || (session && checkingProfile)) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background dark:bg-dark-background">
        <div className="text-primary font-bold text-xl">SoulMatch</div>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/create-organization" element={<CreateOrganizationPage />} />
        <Route path="/confirm-organization" element={<ConfirmOrganizationPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  // User is logged in, check if organization or regular user
  if (organization) {
    return <OrganizationRoutes />;
  }

  if (profile && profile.personality_test_completed) {
    return <MainAppRoutes onTestComplete={handleTestComplete} />;
  }

  // Onboarding Flow for regular users
  return (
    <Routes>
      {!profile && (
        <Route path="*" element={<CreateProfilePage onProfileCreated={handleStateRefresh} />} />
      )}
      {profile && !profile.personality_test_completed && (
        <Route path="*" element={<PersonalityTestPage onTestComplete={handleTestComplete} />} />
      )}
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="w-full font-sans bg-background dark:bg-dark-background">
        <HashRouter>
          <AppContent />
        </HashRouter>
      </div>
    </ThemeProvider>
  );
};

export default App;
