

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ImageIcon, Loader2, Users } from 'lucide-react';
import type { Event, User } from '../types';
import NotificationIcon from '../components/NotificationIcon';
import { supabase } from '../services/supabase';
import { fetchPrivateFile } from '../services/s3Service';
import { AnimatePresence } from 'framer-motion';
import EventFilterModal from '../components/EventFilterModal';

interface HomePageProps {
    events: Event[];
    onlineUsers: User[];
}

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            setLoading(true);
            fetchPrivateFile(src).then(url => {
                objectUrl = url;
                setImageUrl(url);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }

        return () => {
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    if(loading) {
        return <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light rounded-full`}><Loader2 className="animate-spin text-gray-400" size={16}/></div>;
    }
    if(!imageUrl) {
        return <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light rounded-full`}><ImageIcon className="text-gray-400" size={16}/></div>;
    }

    return <img src={imageUrl} alt={alt} className={className} />;
};

const EventCard: React.FC<{ event: Event }> = ({ event }) => {
    const formattedTimeRange = useMemo(() => {
        if (!event?.time) return 'Tidspunkt ukendt';
        
        const startTime = new Date(event.time);
        
        const weekday = startTime.toLocaleString('da-DK', { weekday: 'long' });
        const day = startTime.getDate();
        const month = startTime.toLocaleString('da-DK', { month: 'short' }).replace('.', '');
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        const datePart = `${capitalizedWeekday} d. ${day} ${month}`;

        const startTimeString = startTime.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');

        let timePart = startTimeString;

        if (event.end_time) {
            const endTime = new Date(event.end_time);
            const endTimeString = endTime.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');
            timePart += ` - ${endTimeString}`;
        }
        
        return `${datePart}, ${timePart}`;
    }, [event.time, event.end_time]);


    return (
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm h-full flex flex-col overflow-hidden group">
            {event.image_url ? (
                <div className="aspect-square overflow-hidden">
                    <PrivateImage src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
            ) : (
                <div className={`w-full h-24 flex items-center justify-end p-4 ${event.color}`}>
                    <div className="text-5xl">{event.icon}</div>
                </div>
            )}
            <div className="p-4 flex flex-col flex-1">
                <div>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{formattedTimeRange}</p>
                    <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mt-1 line-clamp-2">{event.title}</h3>
                </div>
                <div className="mt-auto pt-4 flex items-center">
                    <PrivateImage src={event.organization?.logo_url || event.host_avatar_url} alt={event.host_name} className="w-8 h-8 rounded-full mr-2 object-cover" />
                    <div>
                        <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{event.participantCount} deltagere</p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary/70">Host: {event.host_name}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OnlineNowSection: React.FC<{ users: User[] }> = ({ users }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-3">Online nu</h2>
    {users.length > 0 ? (
      <div className="flex space-x-4 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        {users.map(user => (
          <div key={user.id} className="flex flex-col items-center text-center w-20 flex-shrink-0">
            <div className="relative">
              <PrivateImage src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full object-cover shadow-md" />
              <span className="absolute bottom-0.5 right-0.5 block h-4 w-4 rounded-full bg-green-400 border-2 border-white dark:border-dark-surface animate-pulse-slow"></span>
            </div>
            <p className="mt-2 text-sm font-semibold text-text-secondary dark:text-dark-text-secondary truncate w-full">{user.name}</p>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-sm text-text-secondary dark:text-dark-text-secondary bg-gray-50 dark:bg-dark-surface-light p-4 rounded-lg">
        Ingen er online lige nu. Tjek tilbage senere!
      </div>
    )}
  </div>
);

const HomePage: React.FC<HomePageProps> = ({ events, onlineUsers }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const selectedCategoryId = searchParams.get('category_id');

    const filteredEvents = useMemo(() => {
        if (!selectedCategoryId) {
            return events;
        }
        return events.filter(event => event.category?.id === parseInt(selectedCategoryId, 10));
    }, [selectedCategoryId, events]);

    const selectedCategoryName = useMemo(() => {
        if (!selectedCategoryId) return null;
        const event = events.find(e => e.category?.id === parseInt(selectedCategoryId, 10));
        return event?.category?.name || null;
    }, [selectedCategoryId, events]);
    
    const handleApplyFilter = (categoryId: number | null) => {
        if (categoryId) {
            setSearchParams({ category_id: categoryId.toString() });
        } else {
            setSearchParams({});
        }
        setIsFilterModalOpen(false);
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="w-10"></div> {/* Spacer */}
                <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
                <NotificationIcon />
            </div>
            <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder="Søg på dine interesser eller ønsker"
                        className="w-full bg-gray-100 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-full py-3 pl-10 pr-4 text-gray-700 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-dark-text-secondary" size={20} />
                </div>
                <Link to="/friends" className="flex-shrink-0 p-3 bg-gray-100 dark:bg-dark-surface-light rounded-full text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-surface" aria-label="Venner">
                    <Users size={20} />
                </Link>
            </div>

            <OnlineNowSection users={onlineUsers} />

            <div className="my-6">
                <img 
                    src="https://q1f3.c3.e2-9.dev/soulmatch-uploads-public/soulmatch1.png" 
                    alt="SoulMatch promotional banner" 
                    className="w-full rounded-2xl shadow-sm object-cover"
                />
            </div>

      <div className="flex justify-between items-center mb-4">
        <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Undersøg nye muligheder</h2>
            <p className="text-text-secondary dark:text-dark-text-secondary text-sm">Valgt baseret på dine interesser</p>
        </div>
        <button onClick={() => setIsFilterModalOpen(true)} className="p-2 bg-gray-100 dark:bg-dark-surface-light rounded-md">
            <SlidersHorizontal className="text-gray-600 dark:text-dark-text-secondary" />
        </button>
      </div>
      
      {selectedCategoryId && selectedCategoryName && (
        <div className="inline-flex items-center bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light font-semibold px-3 py-1.5 rounded-full mb-4 text-sm">
          <span>Filter: {selectedCategoryName}</span>
          <button onClick={() => setSearchParams({})} className="ml-2 p-1 -mr-1 hover:bg-primary/20 dark:hover:bg-primary/30 rounded-full">
            <X size={16} />
          </button>
        </div>
      )}

      {filteredEvents.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map(event => (
              <Link to={`/event/${event.id}`} key={event.id} className="block">
                <EventCard event={event} />
              </Link>
            ))}
        </div>
      ) : (
        <p className="text-center text-text-secondary dark:text-dark-text-secondary mt-8">Ingen events fundet for den valgte kategori.</p>
      )}

      <AnimatePresence>
        {isFilterModalOpen && (
            <EventFilterModal
                onClose={() => setIsFilterModalOpen(false)}
                onApplyFilter={handleApplyFilter}
            />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;