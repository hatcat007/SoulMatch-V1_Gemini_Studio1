import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, MapPin, Settings, LogOut } from 'lucide-react';
import { supabase } from '../../services/supabase';

const OrganizationSidebar: React.FC = () => {
    const navigate = useNavigate();
    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/create-event', icon: PlusCircle, label: 'Opret Event' },
        { to: '/create-place', icon: MapPin, label: 'Opret Mødested' },
        { to: '#', icon: Settings, label: 'Indstillinger' },
    ];

    const activeLinkClass = 'bg-primary-light text-primary-dark dark:bg-primary/20 dark:text-primary-light';
    const inactiveLinkClass = 'text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-surface-light';

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    };

    return (
        <aside className="w-64 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-dark-border flex-shrink-0 flex flex-col">
            <div className="h-20 flex items-center justify-center border-b border-gray-200 dark:border-dark-border">
                <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center px-4 py-3 rounded-lg font-semibold transition-colors duration-200 ${
                                isActive ? activeLinkClass : inactiveLinkClass
                            }`
                        }
                    >
                        <item.icon className="h-5 w-5 mr-3" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-dark-border">
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
