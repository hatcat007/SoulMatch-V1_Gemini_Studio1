import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, User, Shield, FileText, HelpCircle, LogOut, Calendar, Link as LinkIcon, ExternalLink, Loader2, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import type { GoogleCalendarSettings } from '../types';
import { getCalendarSettings, saveCalendarSettings, clearCalendarSettings } from '../services/googleCalendarService';
import { useNotifications } from '../hooks/useNotifications';

// IMPORTANT: Replace with your actual Google Client ID from the Google Cloud Console.
const GOOGLE_CLIENT_ID = 'DIT_GOOGLE_CLIENT_ID_HER';
// This must match the "Authorized redirect URIs" in your Google Cloud Console.
// For local development:
const REDIRECT_URI = 'http://localhost:3000';
// For production:
// const REDIRECT_URI = 'https://soulmatchdk.app';

const SettingsItem: React.FC<{ icon: React.ReactNode; label: string; to: string; }> = ({ icon, label, to }) => {
    const navigate = useNavigate();
    return (
        <button onClick={() => navigate(to)} className="w-full flex items-center justify-between p-4 bg-white dark:bg-dark-surface rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-dark-surface-light">
            <div className="flex items-center">
                <div className="text-primary mr-4">{icon}</div>
                <span className="font-semibold text-text-primary dark:text-dark-text-primary">{label}</span>
            </div>
            <ChevronRight className="text-gray-400" />
        </button>
    );
};


const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToast } = useNotifications();

    const [calendarSettings, setCalendarSettings] = useState<GoogleCalendarSettings | null>(getCalendarSettings());
    const [isExchangingToken, setIsExchangingToken] = useState(false);
    const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
    const [calendarError, setCalendarError] = useState<string | null>(null);

    const [emailSettings, setEmailSettings] = useState({
        new_message: true,
        new_event: true,
    });
    const [emailSettingsLoading, setEmailSettingsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setEmailSettings({
                new_message: user.email_notifications_new_message ?? true,
                new_event: user.email_notifications_new_event ?? true,
            });
            setEmailSettingsLoading(false);
        }
    }, [user]);

    const handleEmailToggle = async (setting: 'new_message' | 'new_event') => {
        if (!user) return;

        const newSettings = { ...emailSettings, [setting]: !emailSettings[setting] };
        setEmailSettings(newSettings);

        const { error } = await supabase
            .from('users')
            .update({ [`email_notifications_${setting}`]: newSettings[setting] })
            .eq('id', user.id);

        if (error) {
            addToast({ type: 'system', message: `Fejl: Kunne ikke gemme indstilling.` });
            setEmailSettings(prev => ({...prev, [setting]: !prev[setting]})); // Revert on error
        } else {
            addToast({ type: 'system', message: 'Indstilling gemt!' });
        }
    };

    const handleConnectGoogle = () => {
        if (GOOGLE_CLIENT_ID === 'DIT_GOOGLE_CLIENT_ID_HER') {
            alert('Fejl: Google Client ID er ikke konfigureret.');
            return;
        }

        const scopes = [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email',
        ].join(' ');

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: `${REDIRECT_URI}/#/settings`,
            response_type: 'code',
            scope: scopes,
            access_type: 'offline',
            prompt: 'consent',
        })}`;
        window.location.href = authUrl;
    };

    const handleDisconnect = () => {
        clearCalendarSettings();
        setCalendarSettings(null);
    };

    const handleCalendarChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'create-new') {
            handleCreateCalendar();
        } else if (calendarSettings) {
            const newSettings = { ...calendarSettings, selectedCalendar: value };
            setCalendarSettings(newSettings);
            saveCalendarSettings(newSettings);
        }
    };
    
    const handleCreateCalendar = async () => {
        if (!calendarSettings?.accessToken) return;
        setIsCreatingCalendar(true);
        setCalendarError(null);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('create-google-calendar', { body: { accessToken: calendarSettings.accessToken } });
            if (invokeError) throw invokeError;
            const newCalendar = { id: data.id, summary: data.summary };
            const updatedSettings = { ...calendarSettings, calendars: [...(calendarSettings.calendars || []), newCalendar], selectedCalendar: newCalendar.id };
            setCalendarSettings(updatedSettings);
            saveCalendarSettings(updatedSettings);
        } catch (e: any) {
            setCalendarError('Kunne ikke oprette kalender: ' + e.message);
        } finally {
            setIsCreatingCalendar(false);
        }
    };

    useEffect(() => {
        const exchangeCodeForToken = async (code: string) => {
            setIsExchangingToken(true);
            setCalendarError(null);
            try {
                const { data, error: invokeError } = await supabase.functions.invoke('google-calendar-token-exchange', { body: { code } });
                if (invokeError) throw invokeError;
                const newSettings: GoogleCalendarSettings = {
                    connected: true, email: data.email, calendars: data.calendars, selectedCalendar: data.calendars?.[0]?.id || '',
                    accessToken: data.accessToken, refreshToken: data.refreshToken, expiry: data.expiry,
                };
                setCalendarSettings(newSettings);
                saveCalendarSettings(newSettings);
            } catch (e: any) {
                 setCalendarError('Kunne ikke forbinde til Google Kalender: ' + e.message);
            } finally {
                setIsExchangingToken(false);
                navigate('/settings', { replace: true });
            }
        };

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
            exchangeCodeForToken(code);
        }
    }, [navigate]);
    
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
            <header className="flex-shrink-0 flex items-center p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft /></button>
                <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mx-auto">Indstillinger</h1>
                <div className="w-8"></div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                 <style>{`.toggle-checkbox:checked { right: 0; border-color: #006B76; } .toggle-checkbox:checked + .toggle-label { background-color: #006B76; }`}</style>
                <div className="max-w-2xl mx-auto space-y-4">
                    <SettingsItem icon={<User size={24} />} label="Rediger Profil" to="/edit-profile" />

                     <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm">
                        <h3 className="font-bold text-lg mb-4 text-text-primary dark:text-dark-text-primary flex items-center"><Bell size={20} className="mr-2 text-primary"/>Email Notifikationer</h3>
                        {emailSettingsLoading ? <div className="flex justify-center"><Loader2 className="animate-spin"/></div> : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between"><p className="text-sm text-gray-600 dark:text-dark-text-secondary flex-1 mr-4">Ny chatbesked</p><div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle"><input type="checkbox" id="toggle-msg" checked={emailSettings.new_message} onChange={() => handleEmailToggle('new_message')} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/><label htmlFor="toggle-msg" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label></div></div>
                                <div className="flex items-center justify-between"><p className="text-sm text-gray-600 dark:text-dark-text-secondary flex-1 mr-4">Nye events der matcher dig</p><div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle"><input type="checkbox" id="toggle-event" checked={emailSettings.new_event} onChange={() => handleEmailToggle('new_event')} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/><label htmlFor="toggle-event" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label></div></div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm">
                        <h3 className="font-bold text-lg mb-2 text-text-primary dark:text-dark-text-primary flex items-center"><Calendar size={20} className="mr-2 text-primary"/>Google Kalender Synkronisering</h3>
                        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">Tilføj automatisk events, du deltager i, til din Google Kalender.</p>
                        
                        {isExchangingToken ? (
                            <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-dark-surface-light rounded-md"><Loader2 className="animate-spin text-primary mr-2" /><span className="font-semibold">Forbinder...</span></div>
                        ) : calendarSettings?.connected ? (
                            <div className="space-y-3">
                                <p className="text-sm font-semibold bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-3 py-2 rounded-md">Forbundet som: {calendarSettings.email}</p>
                                <div>
                                    <label htmlFor="calendar-select" className="block text-sm font-medium mb-1">Vælg kalender at tilføje til:</label>
                                    <select id="calendar-select" value={isCreatingCalendar ? 'loading' : calendarSettings.selectedCalendar} onChange={handleCalendarChange} disabled={isCreatingCalendar} className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-md">
                                         <option value="create-new" className="font-bold">Opret ny 'SoulMatch Events' kalender</option>
                                         <option disabled>---</option>
                                         {isCreatingCalendar && <option value="loading">Opretter kalender...</option>}
                                         {calendarSettings.calendars?.map(cal => (<option key={cal.id} value={cal.id}>{cal.summary}</option>))}
                                    </select>
                                </div>
                                <button onClick={handleDisconnect} className="text-sm font-semibold text-red-600 hover:underline">Frakobl</button>
                            </div>
                        ) : (
                             <button onClick={handleConnectGoogle} className="w-full flex items-center justify-center p-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600"><LinkIcon size={18} className="mr-2"/> Forbind med Google Kalender</button>
                        )}
                        {calendarError && <p className="text-red-500 text-sm mt-2">{calendarError}</p>}
                         <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary dark:text-dark-text-secondary mt-3 flex items-center hover:underline">Åbn Google Kalender <ExternalLink size={12} className="ml-1"/></a>
                    </div>

                    <SettingsItem icon={<Shield size={24} />} label="Privatlivspolitik" to="/privacy" />
                    <SettingsItem icon={<FileText size={24} />} label="Servicevilkår" to="/terms" />
                    <SettingsItem icon={<HelpCircle size={24} />} label="FAQ" to="/faq" />
                    
                    <div className="pt-4">
                        <button onClick={handleLogout} className="w-full flex items-center justify-center p-4 bg-white dark:bg-dark-surface rounded-lg shadow-sm text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20"><LogOut className="mr-2" size={20} />Log ud</button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;