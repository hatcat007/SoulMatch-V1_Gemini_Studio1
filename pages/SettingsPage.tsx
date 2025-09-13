import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Bell, Shield, HelpCircle, FileText,
  LogOut, Palette, ChevronRight, Lock, Link as LinkIcon, Loader2
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import type { GoogleCalendarSettings } from '../types';
import { getCalendarSettings, saveCalendarSettings, clearCalendarSettings } from '../services/googleCalendarService';

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; id: string }> = ({ checked, onChange, id }) => (
    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
        <input 
            type="checkbox" 
            id={id} 
            checked={checked} 
            onChange={(e) => onChange(e.target.checked)} 
            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
        />
        <label 
            htmlFor={id} 
            className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
        ></label>
    </div>
);


const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    
    const [notifications, setNotifications] = useState({
        messages: true,
        eventReminders: true,
        profileViews: false,
    });
    const [privacy, setPrivacy] = useState({
        locationSharing: true,
    });
    
    const [googleCalendar, setGoogleCalendar] = useState<GoogleCalendarSettings | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    useEffect(() => {
        setGoogleCalendar(getCalendarSettings());
    }, []);
    
    useEffect(() => {
        // Google redirects with the code in the search parameters (?code=...), not the hash.
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code && !googleCalendar?.connected) {
            setIsConnecting(true);
            setConnectionError(null);

            const exchangeCodeForToken = async () => {
                try {
                    // Call the Supabase Edge Function to securely exchange the code for a token.
                    const { data, error } = await supabase.functions.invoke('google-calendar-token-exchange', {
                        body: { code },
                    });

                    if (error) throw new Error(error.message);
                    if (data.error) throw new Error(data.error);

                    const newSettings: GoogleCalendarSettings = {
                        connected: true,
                        email: data.email,
                        selectedCalendar: 'primary',
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        expiry: data.expiry,
                    };
                    saveCalendarSettings(newSettings);
                    setGoogleCalendar(newSettings);

                } catch (e: any) {
                    setConnectionError(`Kunne ikke forbinde til Google Kalender: ${e.message}`);
                } finally {
                    setIsConnecting(false);
                    // Clean the URL by removing the search parameters, preserving the hash.
                    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
                }
            };
            exchangeCodeForToken();
        }
    }, [googleCalendar?.connected]);

    const handleConnectGoogle = () => {
        const GOOGLE_CLIENT_ID = 'DIT_GOOGLE_CLIENT_ID_HER'; // <-- VIGTIGT: Udskift med dit rigtige Client ID

        // VIGTIGT: Redirect URI må IKKE indeholde et hash (#) og skal matche
        // præcis det, du har indtastet i Google Cloud Console.
        // For produktion er dette din apps hoved-URL.
        const REDIRECT_URI = 'https://soulmatchdk.app';
        // Til lokal udvikling ville du bruge:
        // const REDIRECT_URI = 'http://localhost:3000';
        
        const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
        
        if (GOOGLE_CLIENT_ID === 'DIT_GOOGLE_CLIENT_ID_HER') {
            alert("Udvikler-fejl: Google Client ID er ikke sat i SettingsPage.tsx");
            return;
        }

        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
        authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', SCOPES);
        authUrl.searchParams.append('access_type', 'offline'); // Vigtigt for at få et refresh_token
        authUrl.searchParams.append('prompt', 'consent'); // Viser samtykke-skærmen hver gang

        window.location.href = authUrl.toString();
    };

    const handleDisconnectGoogle = () => {
        clearCalendarSettings();
        setGoogleCalendar(null);
    };

    const handleCalendarSelection = (selected: string) => {
        if (googleCalendar) {
            const newSettings = { ...googleCalendar, selectedCalendar: selected };
            saveCalendarSettings(newSettings);
            setGoogleCalendar(newSettings);
        }
    };


    const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
        setNotifications(prev => ({ ...prev, [key]: value }));
    };

    const handlePrivacyChange = (key: keyof typeof privacy, value: boolean) => {
        setPrivacy(prev => ({ ...prev, [key]: value }));
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error logging out:', error.message);
        }
        navigate('/');
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
             <style>{`.toggle-checkbox:checked { right: 0; border-color: #006B76; } .toggle-checkbox:checked + .toggle-label { background-color: #006B76; }`}</style>
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Indstillinger</h1>
                <div className="w-8"></div> {/* Spacer */}
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-3xl mx-auto">
                    {/* Account Section */}
                    <section className="mb-6">
                        <h2 className="text-sm font-bold text-text-secondary dark:text-dark-text-secondary uppercase px-4 mb-2">Konto</h2>
                        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-dark-border">
                            <Link to="/edit-profile" className="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                                <User className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">Rediger profil</span>
                                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-dark-text-secondary"/>
                            </Link>
                            <div className="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                                <Lock className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">Skift adgangskode</span>
                                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-dark-text-secondary"/>
                            </div>
                        </div>
                    </section>
                    
                     {/* Notifications Section */}
                    <section className="mb-6">
                        <h2 className="text-sm font-bold text-text-secondary dark:text-dark-text-secondary uppercase px-4 mb-2">Notifikationer</h2>
                        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-dark-border">
                           <div className="flex items-center p-4">
                                <Bell className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">Nye beskeder</span>
                                <ToggleSwitch id="notif-messages" checked={notifications.messages} onChange={(val) => handleNotificationChange('messages', val)} />
                            </div>
                            <div className="flex items-center p-4">
                                <Bell className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">Event påmindelser</span>
                                <ToggleSwitch id="notif-events" checked={notifications.eventReminders} onChange={(val) => handleNotificationChange('eventReminders', val)} />
                            </div>
                             <div className="flex items-center p-4">
                                <Bell className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">Profilvisninger</span>
                                <ToggleSwitch id="notif-views" checked={notifications.profileViews} onChange={(val) => handleNotificationChange('profileViews', val)} />
                            </div>
                        </div>
                    </section>

                    {/* Integrations Section */}
                    <section className="mb-6">
                        <h2 className="text-sm font-bold text-text-secondary dark:text-dark-text-secondary uppercase px-4 mb-2">Integrationer</h2>
                        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden p-4">
                            <h3 className="font-semibold text-text-primary dark:text-dark-text-primary mb-2 flex items-center">
                                <img src="https://q1f3.c3.e2-9.dev/soulmatch-uploads-public/google-calendar-icon.png" alt="Google Calendar" className="w-5 h-5 mr-3"/>
                                Google Kalender Synkronisering
                            </h3>
                            {connectionError && <p className="text-red-500 bg-red-50 dark:bg-red-900/20 text-sm p-3 rounded-md mb-3">{connectionError}</p>}
                            {isConnecting ? (
                                <div className="flex flex-col items-center justify-center p-6 text-center">
                                    <Loader2 className="animate-spin text-primary h-8 w-8 mb-3" />
                                    <p className="font-semibold text-text-primary dark:text-dark-text-primary">Forbinder til Google...</p>
                                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Vent venligst et øjeblik.</p>
                                </div>
                            ) : googleCalendar?.connected ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 p-2 rounded-md">Forbundet som {googleCalendar.email}</p>
                                    <div>
                                        <label htmlFor="calendarSelect" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Tilføj events til kalender:</label>
                                        <select
                                            id="calendarSelect"
                                            value={googleCalendar.selectedCalendar}
                                            onChange={(e) => handleCalendarSelection(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="primary">Primær Kalender</option>
                                            <option value="social">Social</option>
                                            <option value="work">Arbejde</option>
                                        </select>
                                    </div>
                                    <button onClick={handleDisconnectGoogle} className="w-full text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-md">Frakobl</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-3">Synkroniser automatisk events, du deltager i, med din Google Kalender.</p>
                                    <button onClick={handleConnectGoogle} className="w-full flex items-center justify-center bg-blue-500 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-600 transition">
                                        <LinkIcon size={18} className="mr-2"/> Forbind med Google Kalender
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Privacy Section */}
                    <section className="mb-6">
                        <h2 className="text-sm font-bold text-text-secondary dark:text-dark-text-secondary uppercase px-4 mb-2">Privatliv & Sikkerhed</h2>
                        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-dark-border">
                           <div className="flex items-center p-4">
                                <Shield className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">Lokationsdeling</span>
                                 <ToggleSwitch id="privacy-location" checked={privacy.locationSharing} onChange={(val) => handlePrivacyChange('locationSharing', val)} />
                            </div>
                             <div className="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                                <Shield className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">Blokerede brugere</span>
                                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-dark-text-secondary"/>
                            </div>
                        </div>
                    </section>
                    
                     {/* App Section */}
                    <section className="mb-6">
                        <h2 className="text-sm font-bold text-text-secondary dark:text-dark-text-secondary uppercase px-4 mb-2">App</h2>
                        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-dark-border">
                           <div className="flex items-center p-4">
                                <Palette className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">Dark Mode</span>
                                <ToggleSwitch id="app-darkmode" checked={theme === 'dark'} onChange={() => toggleTheme()} />
                            </div>
                        </div>
                    </section>
                    
                    {/* Help & Legal Section */}
                    <section className="mb-8">
                        <h2 className="text-sm font-bold text-text-secondary dark:text-dark-text-secondary uppercase px-4 mb-2">Hjælp & Info</h2>
                        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-dark-border">
                           <Link to="/faq" className="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                                <HelpCircle className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">FAQ</span>
                                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-dark-text-secondary"/>
                            </Link>
                             <Link to="/privacy" className="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                                <FileText className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">Privatlivspolitik</span>
                                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-dark-text-secondary"/>
                            </Link>
                            <Link to="/terms" className="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                                <FileText className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">Servicevilkår</span>
                                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-dark-text-secondary"/>
                            </Link>
                        </div>
                    </section>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center bg-white dark:bg-dark-surface text-red-500 font-bold py-3 px-4 rounded-lg text-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition duration-300 shadow-sm border border-gray-200 dark:border-dark-border"
                    >
                        <LogOut className="w-5 h-5 mr-3"/>
                        Log ud
                    </button>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;