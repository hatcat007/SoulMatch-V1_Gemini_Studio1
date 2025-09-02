



import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
// FIX: `useNotifications` is imported from `hooks/useNotifications` instead of `contexts/NotificationContext`.
import { NotificationProvider } from './contexts/NotificationContext';
import { useNotifications } from './hooks/useNotifications';
import type { NotificationType, User } from './types';

const MockNotificationGenerator: React.FC = () => {
  const { addNotification } = useNotifications();

  React.useEffect(() => {
    const mockUsers: User[] = [
        { id: 101, name: 'Patrick', age: 28, avatarUrl: 'https://i.pravatar.cc/80?u=101', online: true },
        { id: 102, name: 'Johanne', age: 25, avatarUrl: 'https://i.pravatar.cc/80?u=102', online: false },
        { id: 103, name: 'Anne', age: 24, avatarUrl: 'https://i.pravatar.cc/80?u=103', online: true },
        { id: 104, name: 'Chris', age: 30, avatarUrl: 'https://i.pravatar.cc/80?u=104', online: false },
    ];

    const mockNotifs: { message: string; type: NotificationType; actor?: User; icon?: string; timestamp?: number }[] = [
      { message: 'Event starter om 15min 🥳', type: 'event', icon: '🎸', timestamp: Date.now() - (5 * 1000) },
      { message: '👀 på din profil', type: 'profile_view', actor: mockUsers[0], timestamp: Date.now() - (10 * 1000) },
      { message: '👀 på din profil', type: 'profile_view', actor: mockUsers[1], timestamp: Date.now() - (2 * 60 * 1000) },
      { message: 'sendte dig en besked', type: 'message', actor: mockUsers[2], timestamp: Date.now() - (15 * 60 * 1000) },
      { message: 'sendte en venneanmodning', type: 'friend_request', actor: mockUsers[3], timestamp: Date.now() - (1 * 60 * 60 * 1000) },
      { message: 'sendte en venneanmodning', type: 'friend_request', actor: { id: 105, name: 'Maria', age: 27, avatarUrl: 'https://i.pravatar.cc/80?u=105', online: true }, timestamp: new Date('2023-01-12T10:30:00').getTime() },
    ];
    
    // Add initial notifications in reverse chronological order
    mockNotifs.forEach(notif => addNotification(notif));

    const newNotifTemplates = [
        { message: 'Nyt event: "Brætspil aften"!', type: 'event' as const, icon: '🎲' },
        { message: 'vil gerne være din ven.', type: 'friend_request' as const, actor: { id: 110, name: 'Alex', age: 29, avatarUrl: 'https://i.pravatar.cc/80?u=110', online: true }},
    ];

    let i = 0;
    const interval = setInterval(() => {
        const notif = newNotifTemplates[i % newNotifTemplates.length];
        addNotification(notif);
        i++;
    }, 25000); // every 25 seconds

    return () => clearInterval(interval);
  }, []); // Eslint-disable-line react-hooks/exhaustive-deps - only run once on mount

  return null; // This component does not render anything
};


const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleSignup = () => {
    setIsAuthenticated(true);
  };

  return (
    <div className="w-full font-sans bg-background">
      <HashRouter>
        {isAuthenticated ? (
          <NotificationProvider>
            <div className="relative md:flex max-w-7xl mx-auto">
              <BottomNav />
              <main className="flex-1 min-w-0">
                <div className="h-screen overflow-y-auto bg-white md:shadow-lg pb-16 md:pb-0">
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
                      <Route path="*" element={<Navigate to="/home" />} />
                    </Routes>
                </div>
              </main>
            </div>
            <MockNotificationGenerator />
          </NotificationProvider>
        ) : (
          <main className="w-full max-w-sm mx-auto h-screen bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<OnboardingPage />} />
                <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                <Route path="/signup" element={<SignupPage onSignup={handleSignup} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </main>
        )}
      </HashRouter>
    </div>
  );
};

export default App;