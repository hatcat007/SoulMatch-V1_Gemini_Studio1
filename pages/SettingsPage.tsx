

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Bell, Shield, HelpCircle, FileText,
  LogOut, Palette, ChevronRight, Lock
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';

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
    
    // Mock state for other toggles
    const [notifications, setNotifications] = useState({
        messages: true,
        eventReminders: true,
        profileViews: false,
    });
    const [privacy, setPrivacy] = useState({
        locationSharing: true,
    });

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
        // The onAuthStateChange listener in App.tsx will handle the redirect,
        // but this ensures a more immediate change.
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
                            <div className="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                                <User className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary mr-4"/>
                                <span className="flex-1 text-text-primary dark:text-dark-text-primary">Rediger profil</span>
                                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-dark-text-secondary"/>
                            </div>
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
