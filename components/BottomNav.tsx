
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

  const activeLinkClass = 'text-primary-dark';
  const inactiveLinkClass = 'text-gray-400';

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-sm mx-auto bg-white border-t border-gray-200 shadow-t-lg">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full ${
                  isActive ? activeLinkClass : inactiveLinkClass
                } ${item.isCentral ? '-mt-6' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  {item.isCentral ? (
                     <Icon className="h-14 w-14 text-primary bg-white rounded-full p-1 border-4 border-white" strokeWidth={1.5} />
                  ) : (
                    <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
