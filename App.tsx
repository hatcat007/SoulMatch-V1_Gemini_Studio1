

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './services/supabase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import type { Event, Place, User, DropInInvitation, Message, MessageThread } from './types';
import { LogOut, AlertTriangle } from 'lucide-react';


// Page imports
import OnboardingPage from './pages/OnboardingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CreateProfilePage from './pages/CreateProfilePage';
import PersonalityTestPage from './pages/PersonalityTestPage';
import HomePage from './pages/HomePage';
import PlacesPage from './pages/PlacesPage';
import PlaceDetailPage from './pages/PlaceDetailPage';
import ChatListPage from './pages/ChatListPage';
import ChatPage from './pages/ChatPage';
import CreateEventPage from './pages/CreateEventPage';
import ProfilePage from './pages/ProfilePage';
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';
import SettingsPage from './pages/SettingsPage';
import EventDetailPage from './pages/EventDetailPage';
import EventFilterPage from './pages/EventFilterPage';
import PlacesFilterPage from './pages/PlacesFilterPage';
import SoulmatchesPage from './pages/SoulmatchesPage';
import EditProfilePage from './pages/EditProfilePage';
import MyEventsPage from './pages/MyEventsPage';
import EditEventPage from './pages/EditEventPage';
import FriendsPage from './pages/FriendsPage';
import CheckinPage from './pages/CheckinPage';
import UserProfilePage from './pages/UserProfilePage';
import CreatePlannedEventPage from './pages/CreatePlannedEventPage';
import CreateDropInPage from './pages/CreateDropInPage';
import DropInDetailPage from './pages/DropInDetailPage';
import FAQPage from './pages/FAQPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

// Org imports
import CreateOrganizationPage from './pages/CreateOrganizationPage';
import ConfirmOrganizationPage from './pages/ConfirmOrganizationPage';
import OrganizationLayout from './pages/organization/OrganizationLayout';
import OrganizationDashboardPage from './pages/organization/OrganizationDashboardPage';
import CreateOrgEventPage from './pages/organization/CreateOrgEventPage';
import ImportEventPage from './pages/organization/ImportEventPage';
import CreatePlacePage from './pages/organization/CreatePlacePage';
import OrganizationSettingsPage from './pages/organization/OrganizationSettingsPage';
import EditOrgEventPage from './pages/organization/EditOrgEventPage';
import EditPlacePage from './pages/organization/EditPlacePage';
import OrganizationChatListPage from './pages/organization/OrganizationChatListPage';
import OrganizationProfilePage from './pages/OrganizationProfilePage';

// Admin import
import AdminPage from './pages/AdminPage';
import PublicEventPage from './pages/PublicEventPage';
import PublicPlacePage from './pages/PublicPlacePage';
import NotificationsPage from './pages/NotificationsPage';


// Chat Cache Context
interface ChatCache {
  [chatId: string]: {
    thread: MessageThread;
    messages: Message[];
  };
}
interface ChatCacheContextType {
  cache: ChatCache;
  setInitialChatData: (chatId: string, thread: MessageThread, messages: Message[]) => void;
  addMessageToCache: (chatId: string, message: Message) => void;
  isChatCached: (chatId: string) => boolean;
}

const ChatCacheContext = createContext<ChatCacheContextType | undefined>(undefined);

export const useChatCache = () => {
    const context = useContext(ChatCacheContext);
    if (!context) throw new Error('useChatCache must be used within a ChatCacheProvider');
    return context;
};

const ChatCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cache, setCache] = useState<ChatCache>({});
    
    const setInitialChatData = useCallback((chatId: string, thread: MessageThread, messages: Message[]) => {
        setCache(prev => ({ ...prev, [chatId]: { thread, messages } }));
    }, []);

    const addMessageToCache = useCallback((chatId: string, message: Message) => {
        setCache(prev => {
            const current = prev[chatId];
            if (!current || current.messages.some(m => m.id === message.id)) return prev;
            return {
                ...prev,
                [chatId]: {
                    ...current,
                    messages: [...current.messages, message],
                    thread: { ...current.thread, last_message: message.text || "Billede sendt", timestamp: message.created_at }
                },
            };
        });
    }, []);

    const isChatCached = useCallback((chatId: string) => !!cache[chatId], [cache]);

    const value = { cache, setInitialChatData, addMessageToCache, isChatCached };

    return <ChatCacheContext.Provider value={value}>{children}</ChatCacheContext.Provider>;
};

// Main App component logic
const AppContent: React.FC = () => {
    const { session, user, organization, loading, refetchUserProfile } = useAuth();
    const [appData, setAppData] = useState<{ events: Event[], places: Place[], onlineUsers: User[], dropIns: DropInInvitation[] }>({ events: [], places: [], onlineUsers: [], dropIns: [] });
    const [dataLoading, setDataLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!session) { setDataLoading(false); return; }
        setDataLoading(true);

        const placesPromise = supabase
            .from('places')
            .select(`
                *,
                organization:organizations(*),
                category:categories(*),
                place_activities:place_activities(activity:activities(*)),
                place_interests:place_interests(interest:interests(*))
            `);

        // FIX: Replaced the 'get_all_events' RPC call with a direct, more reliable select query.
        // This query fetches all events and joins all necessary related data, ensuring that no events are
        // missed on the home page, which resolves the bug.
        const eventsPromise = supabase
            .from('events')
            .select(`
                *,
                organization:organizations(*, activities:organization_activities(activity:activities(*))),
                category:categories(*),
                interests:event_interests(interest:interests(*)),
                event_activities:event_activities(activity:activities(*)),
                participants:event_participants(count)
            `);

        const [eventsRes, placesRes, usersRes, dropInsRes] = await Promise.all([
            eventsPromise,
            placesPromise,
            supabase.from('users').select('*').eq('online', true),
            supabase.rpc('get_active_drop_in_invitations'),
        ]);

        // FIX: Transform event data to match the 'Event' type. The query returns a nested
        // participant count, which is flattened here to 'participantCount'.
        const transformedEvents = eventsRes.data?.map(event => {
            const { participants, ...rest } = event;
            return {
                ...rest,
                participantCount: participants[0]?.count || 0,
            };
        }) || [];

        setAppData({
            events: transformedEvents as Event[],
            places: (placesRes.data as any) || [],
            onlineUsers: usersRes.data || [],
            dropIns: dropInsRes.data || [],
        });
        setDataLoading(false);
    }, [session]);

    useEffect(() => {
        if(session) fetchData();
    }, [session, fetchData]);

    if (loading) {
        return <LoadingScreen fullScreen message="Indlæser..." />;
    }
    
    if (session && !user && !organization) {
        const handleLogout = async () => {
            await supabase.auth.signOut();
        };
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">
                    <div className="mx-auto inline-block bg-red-100 text-red-600 p-3 rounded-full mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Hov hov...</h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary mb-4">Du har vidst ikke adgang.</p>
                    <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary bg-gray-100 dark:bg-dark-surface-light p-3 rounded-md break-all">
                        {session.user.email}
                    </p>
                    <button
                        onClick={handleLogout}
                        className="mt-6 w-full flex items-center justify-center bg-primary text-white font-bold py-3 px-4 rounded-full hover:bg-primary-dark transition"
                    >
                        <LogOut size={18} className="mr-2"/> Log ud
                    </button>
                </div>
            </div>
        );
    }
    
    if (session && user && !organization) {
        if (!user.name) {
            return <CreateProfilePage onProfileCreated={refetchUserProfile} />;
        }
        if (!user.personality_test_completed) {
            return <PersonalityTestPage onTestComplete={refetchUserProfile} />;
        }
    }
    
    const OrgRoutes: React.FC = () => (
        <OrganizationLayout>
            <Routes>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<OrganizationDashboardPage />} />
                <Route path="create-event" element={<CreateOrgEventPage />} />
                <Route path="import-event" element={<ImportEventPage />} />
                <Route path="create-place" element={<CreatePlacePage />} />
                <Route path="settings" element={<OrganizationSettingsPage />} />
                <Route path="edit-event/:eventId" element={<EditOrgEventPage />} />
                <Route path="edit-place/:placeId" element={<EditPlacePage />} />
                <Route path="chat" element={<OrganizationChatListPage />} />
                <Route path="chat/:chatId" element={<ChatPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </OrganizationLayout>
    );

    const UserRoutes: React.FC = () => (
         <div className="flex flex-col md:flex-row h-screen bg-gray-50 dark:bg-dark-background">
            <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
                 <Routes>
                    <Route path="home" element={<HomePage events={appData.events} onlineUsers={appData.onlineUsers} dropIns={appData.dropIns} loading={dataLoading} />} />
                    <Route path="places" element={<PlacesPage places={appData.places} />} />
                    <Route path="chat" element={<ChatListPage />} />
                    <Route path="create" element={<CreateEventPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="event/:eventId" element={<EventDetailPage />} />
                    <Route path="place/:placeId" element={<PlaceDetailPage />} />
                    <Route path="places/filter" element={<PlacesFilterPage />} />
                    <Route path="soulmatches" element={<SoulmatchesPage />} />
                    <Route path="edit-profile" element={<EditProfilePage />} />
                    <Route path="my-events" element={<MyEventsPage />} />
                    <Route path="edit-event/:eventId" element={<EditEventPage />} />
                    <Route path="friends" element={<FriendsPage />} />
                    <Route path="chat/:chatId" element={<ChatPage />} />
                    <Route path="checkin" element={<CheckinPage />} />
                    <Route path="user/:userId" element={<UserProfilePage />} />
                    <Route path="create-planned-event" element={<CreatePlannedEventPage />} />
                    <Route path="create-drop-in" element={<CreateDropInPage />} />
                    <Route path="drop-in/:dropInId" element={<DropInDetailPage />} />
                    <Route path="faq" element={<FAQPage />} />
                    <Route path="privacy" element={<PrivacyPolicyPage />} />
                    <Route path="terms" element={<TermsOfServicePage />} />
                    <Route path="organization/:organizationId" element={<OrganizationProfilePage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="*" element={<Navigate to="/home" replace />} />
                 </Routes>
            </div>
            <BottomNav />
        </div>
    );
    
    return (
        <Routes>
            <Route path="/onboarding" element={!session ? <OnboardingPage /> : <Navigate to="/" />} />
            <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/signup" element={!session ? <SignupPage /> : <Navigate to="/" />} />
            <Route path="/create-organization" element={!session ? <CreateOrganizationPage /> : <Navigate to="/" />} />
            <Route path="/confirm-organization" element={!session ? <ConfirmOrganizationPage /> : <Navigate to="/" />} />
            <Route path="/admin" element={session ? <AdminPage /> : <Navigate to="/login" />} />
            <Route path="/event/:orgSlug/:eventSlug" element={<PublicEventPage />} />
            <Route path="/place/:orgSlug/:placeSlug" element={<PublicPlacePage />} />
            
            {/* FIX: Moved Privacy and Terms routes to be public, accessible without a session. */}
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            
            <Route path="/*" element={
                !session ? <Navigate to="/onboarding" /> : 
                organization ? <OrgRoutes /> :
                <UserRoutes />
            } />
        </Routes>
    );
};

// Component with all providers
const App: React.FC = () => (
    <HashRouter>
        <ThemeProvider>
            <AuthProvider>
                <NotificationProvider>
                    <ChatCacheProvider>
                        <AppContent />
                    </ChatCacheProvider>
                </NotificationProvider>
            </AuthProvider>
        </ThemeProvider>
    </HashRouter>
);

export default App;