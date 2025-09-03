import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, MapPin, Settings, LogOut, Sparkles } from 'lucide-react';
import { supabase } from '../../services/supabase';
import type { Organization } from '../../types';

const OrganizationSidebar: React.FC = () => {
    const navigate = useNavigate();
    const [organization, setOrganization] = useState<Organization | null>(null);

    useEffect(() => {
        const fetchOrgName = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('name')
                    .eq('auth_id', user.id)
                    .single();
                if (orgData) {
                    setOrganization(orgData as Organization);
                }
            }
        };
        fetchOrgName();
    }, []);

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', mobileLabel: 'Dashboard' },
        { to: '/create-event', icon: PlusCircle, label: 'Opret Event', mobileLabel: 'Opret' },
        { to: '/import-event', icon: Sparkles, label: 'Importer Event', mobileLabel: 'Import' },
        { to: '/create-place', icon: MapPin, label: 'Opret Mødested', mobileLabel: 'Mødested' },
        { to: '#', icon: Settings, label: 'Indstillinger', mobileLabel: 'Settings' },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    };
    
    const navLinkClasses = ({ isActive }: { isActive: boolean }) => {
        const base = "flex flex-col items-center justify-center w-full transition-colors duration-200 group h-16 md:h-auto md:flex-row md:justify-start md:px-4 md:py-3 md:rounded-lg md:font-semibold";
        const mobileActive = 'text-primary-dark dark:text-primary-light';
        const mobileInactive = 'text-gray-400 dark:text-dark-text-secondary';
        const desktopActive = 'md:bg-primary-light md:dark:bg-primary/20';
        const desktopInactive = 'md:text-gray-600 md:dark:text-dark-text-secondary md:hover:bg-gray-100 md:dark:hover:bg-dark-surface-light';
        
        return `${base} ${isActive ? `${mobileActive} ${desktopActive}` : `${mobileInactive} ${desktopInactive}`}`;
    };

    return (
        <aside className="fixed z-20 bottom-0 left-0 right-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border md:relative md:w-64 md:border-r md:border-t-0 flex-shrink-0 flex flex-col">
            {/* Desktop Header */}
            <div className="hidden md:flex h-20 items-center justify-center border-b border-gray-200 dark:border-dark-border px-4 text-center">
                <div>
                    <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
                    {organization && (
                         <p className="text-xs text-text-secondary dark:text-dark-text-secondary">- Jeres {organization.name} side.</p>
                    )}
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 md:px-4 md:py-6">
                <div className="flex justify-around items-center h-full md:flex-col md:h-auto md:space-y-2">
                    {navItems.map((item) => (
                        <NavLink key={item.to} to={item.to} className={navLinkClasses}>
                            <item.icon className="h-6 w-6 md:h-5 md:w-5 md:mr-3" />
                            <span className="text-xs mt-1 md:hidden">{item.mobileLabel}</span>
                            <span className="hidden md:inline md:text-base">{item.label}</span>
                        </NavLink>
                    ))}
                     <button
                        onClick={handleLogout}
                        className={`md:hidden flex flex-col items-center justify-center w-full transition-colors duration-200 group h-16 text-red-500`}
                     >
                        <LogOut className="h-6 w-6" />
                        <span className="text-xs mt-1">Log ud</span>
                    </button>
                </div>
            </nav>

            {/* Desktop Logout Button */}
            <div className="hidden md:block p-4 border-t border-gray-200 dark:border-dark-border">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 rounded-lg font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                    <LogOut className="h-5 w-5 mr-3" />
                    <span>Log ud</span>
                </button>
            </div>
        </aside>
    );
};

export default OrganizationSidebar;
