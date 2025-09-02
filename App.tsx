
import React, { useState } from 'react';
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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
                    <Route path="/event/:eventId" element={<EventDetailPage />} />
                    <Route path="/organization/:organizationId" element={<OrganizationProfilePage />} />
                    <Route path="/checkin" element={<CheckinPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="*" element={<Navigate to="/home" />} />
                  </Routes>
              </div>
            </main>
          </div>
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