
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
import { NotificationProvider } from './contexts/NotificationContext';
import { useNotifications } from './hooks/useNotifications';
import type { NotificationType, User } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { supabase } from './services/supabase';
import type { Session } from '@supabase/supabase-js';

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

const MainAppRoutes: React.FC = () => (
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
                <Route path="*" element={<Navigate to="/home" />} />
              </Routes>
          </div>
        </main>
      </div>
      <MockNotificationGenerator />
    </NotificationProvider>
);

const AppContent: React.FC = () => {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<User | null>(null);
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

    if (session) {
      setCheckingProfile(true);
      supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single()
        .then(({ data, error }) => {
          setProfile(data ? (data as User) : null);
          setCheckingProfile(false);
        });
    } else {
      setProfile(null);
      setCheckingProfile(false);
    }
  }, [session, loading, refreshProfileToggle]);

  React.useEffect(() => {
    // This effect runs when the profile data changes.
    // If the test was just completed and the profile now reflects that, navigate.
    if (testJustCompleted && profile?.personality_test_completed) {
      navigate('/profile');
      setTestJustCompleted(false); // Reset flag after navigation to prevent loops
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
      <main className="w-full max-w-sm mx-auto h-screen bg-white dark:bg-dark-surface shadow-2xl flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<OnboardingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/create-organization" element={<CreateOrganizationPage />} />
            <Route path="/confirm-organization" element={<ConfirmOrganizationPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    );
  }

  // User is logged in, determine which part of the app to show.
  if (profile && profile.personality_test_completed) {
    return <MainAppRoutes />;
  }

  // Onboarding Flow for logged-in users
  return (
    <main className="w-full max-w-sm mx-auto h-screen bg-white dark:bg-dark-surface shadow-2xl flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <Routes>
          {!profile && (
            <Route path="*" element={<CreateProfilePage onProfileCreated={handleStateRefresh} />} />
          )}
          {profile && !profile.personality_test_completed && (
            <Route path="*" element={<PersonalityTestPage onTestComplete={handleTestComplete} />} />
          )}
        </Routes>
      </div>
    </main>
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
