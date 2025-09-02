
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MapPin, PlusCircle, MessageCircle, User } from 'lucide-react';

const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/places', icon: MapPin, label: 'Places' },
    { to: '/create', icon: PlusCircle, label: 'Create', isCentral: true },
    { to: '/chat', icon: MessageCircle, label: 'Chat' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const activeLinkClass = 'text-primary-dark dark:text-primary-light';
  const inactiveLinkClass = 'text-gray-400 dark:text-dark-text-secondary';

  return (
    <nav className="fixed z-20 bottom-0 left-0 right-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border shadow-t-lg md:relative md:z-auto md:h-screen md:w-20 md:flex-shrink-0 md:max-w-none md:border-r md:border-t-0 md:shadow-none md:mx-0">
      <div className="flex justify-around items-center h-16 md:flex-col md:h-auto md:w-full md:pt-8 md:space-y-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full transition-colors duration-200 group ${
                  isActive ? activeLinkClass : inactiveLinkClass
                } ${item.isCentral ? '-mt-6 md:mt-0' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  {item.isCentral ? (
                     <Icon className="h-14 w-14 text-primary bg-white dark:bg-dark-surface rounded-full p-1 border-4 border-white dark:border-dark-surface md:border-none md:bg-transparent md:text-primary-dark md:dark:text-primary-light md:h-12 md:w-12" strokeWidth={1.5} />
                  ) : (
                    <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                  )}
                  <span className={`text-xs mt-1 hidden md:block group-hover:text-primary-dark dark:group-hover:text-primary-light ${isActive ? 'font-bold' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;