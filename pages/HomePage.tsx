

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin, Users, HeartHandshake, User, Building, Loader2, Image as ImageIcon } from 'lucide-react';
import type { Event, User as UserType } from '../types';
import NotificationIcon from '../components/NotificationIcon';
import { fetchPrivateFile } from '../services/s3Service';
import { AnimatePresence, motion } from 'framer-motion';
import EventFilterModal, { Filters } from '../components/EventFilterModal';

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
            }).catch(() => setLoading(false));
        } else {
            setLoading(false);
        }

        return () => {
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    if(loading) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light animate-pulse`} />;
    if(!imageUrl) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light flex items-center justify-center`}><ImageIcon className="text-gray-400" /></div>;

    return <img src={imageUrl} alt={alt} className={className} />;
};


const EventCard: React.FC<{ event: Event }> = ({ event }) => (
    <Link to={`/event/${event.id}`} className="block bg-white dark:bg-dark-surface rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
        <div className="relative h-48 bg-gray-200 dark:bg-dark-surface-light">
            <PrivateImage src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 flex items-center bg-white/80 backdrop-blur-sm text-text-primary font-semibold px-2 py-1 rounded-full text-sm">
                <Users size={14} className="mr-1.5" />
                {event.participantCount}
            </div>
             {event.is_diagnosis_friendly && (
                <div className="absolute top-2 left-2 flex items-center bg-blue-100/80 backdrop-blur-sm text-blue-800 font-semibold px-2 py-1 rounded-full text-xs">
                    <HeartHandshake size={14} className="mr-1.5" />
                    Diagnosevenligt
                </div>
            )}
        </div>
        <div className="p-4">
            <div className="flex items-center mb-2">
                 <div className={`w-10 h-10 rounded-lg ${event.color || 'bg-primary-light'} flex items-center justify-center text-xl mr-3`}>
                    {event.icon}
                </div>
                <div>
                    <p className="text-xs font-semibold text-primary">{new Date(event.time).toLocaleString('da-DK', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                    <h3 className="text-lg font-bold text-text-primary dark:text-dark-text-primary line-clamp-2">{event.title}</h3>
                </div>
            </div>
            <div className="flex items-center text-xs text-gray-500 dark:text-dark-text-secondary mt-3">
                {event.creator_user_id ? <User size={14} className="mr-1.5" /> : <Building size={14} className="mr-1.5" />}
                <span>Host: {event.host_name}</span>
            </div>
        </div>
    </Link>
);


const HomePage: React.FC<{ events: Event[]; onlineUsers: UserType[] }> = ({ events, onlineUsers }) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState<Filters>({
        categoryId: null, date: null, timeOfDay: null,
        interestIds: [], activityIds: [], creatorType: 'all',
    });

    const filteredEvents = useMemo(() => {
        let eventsToFilter = events;

        // Apply search term filter first
        if (searchTerm.trim()) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            eventsToFilter = eventsToFilter.filter(event => {
                const hasMatchingInterest = event.interests?.some(i => i.interest.name.toLowerCase().includes(lowerCaseSearchTerm));
                const hasMatchingOrgActivity = event.organization?.activities?.some(a => a.activity.name.toLowerCase().includes(lowerCaseSearchTerm));
                const hasMatchingEventActivity = event.event_activities?.some(a => a.activity.name.toLowerCase().includes(lowerCaseSearchTerm));

                return (
                    event.title.toLowerCase().includes(lowerCaseSearchTerm) ||
                    (event.description && event.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
                    hasMatchingInterest ||
                    hasMatchingOrgActivity ||
                    hasMatchingEventActivity
                );
            });
        }
        
        // Apply modal filters
        return eventsToFilter.filter(event => {
            if (activeFilters.categoryId && event.category_id !== activeFilters.categoryId) return false;
            if (activeFilters.date) {
                const eventDate = new Date(event.time).toISOString().split('T')[0];
                if (eventDate !== activeFilters.date) return false;
            }
            if (activeFilters.timeOfDay) {
                const hour = new Date(event.time).getHours();
                if (activeFilters.timeOfDay === 'morning' && (hour < 6 || hour >= 12)) return false;
                if (activeFilters.timeOfDay === 'afternoon' && (hour < 12 || hour >= 18)) return false;
                if (activeFilters.timeOfDay === 'evening' && (hour < 18 || hour >= 24)) return false;
            }
            if (activeFilters.creatorType === 'user' && !event.creator_user_id) return false;
            if (activeFilters.creatorType === 'org' && !event.organization_id) return false;

            if (activeFilters.interestIds.length > 0) {
                const eventInterestIds = new Set(event.interests?.map(i => i.interest.id) || []);
                if (!activeFilters.interestIds.some(id => eventInterestIds.has(id))) return false;
            }
            if (activeFilters.activityIds.length > 0) {
                const eventActivityIds = new Set([
                    ...(event.organization?.activities?.map(a => a.activity.id) || []),
                    ...(event.event_activities?.map(a => a.activity.id) || [])
                ]);
                if (!activeFilters.activityIds.some(id => eventActivityIds.has(id))) return false;
            }
            return true;
        });
    }, [events, activeFilters, searchTerm]);

    return (
        <div className="p-4 md:p-6 relative">
            <div className="flex justify-between items-center mb-4">
                <div className="w-10"></div> {/* Spacer */}
                <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
                <NotificationIcon />
            </div>
            
            <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Søg på Interesser eller Aktiviteter"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-full py-3 pl-10 pr-4 text-gray-700 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {onlineUsers.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-text-primary dark:text-dark-text-primary mb-2">Online nu</h2>
                    <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                        {onlineUsers.map(user => (
                            <div key={user.id} className="flex-shrink-0 text-center w-20">
                                <div className="relative">
                                    <PrivateImage src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full mx-auto object-cover" />
                                    <span className="absolute bottom-0 right-2 block h-4 w-4 rounded-full bg-green-400 border-2 border-background dark:border-dark-background"></span>
                                </div>
                                <p className="text-xs mt-1 truncate font-semibold text-text-secondary dark:text-dark-text-secondary">{user.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Events for dig</h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary text-sm">Baseret på dine interesser</p>
                </div>
                <button onClick={() => setIsFilterOpen(true)} className="p-2 bg-gray-100 dark:bg-dark-surface-light rounded-md">
                    <SlidersHorizontal className="text-gray-600 dark:text-dark-text-primary" />
                </button>
            </div>

             <AnimatePresence>
                {isFilterOpen && (
                    <EventFilterModal 
                        onClose={() => setIsFilterOpen(false)}
                        onApplyFilter={(filters) => {
                            setActiveFilters(filters);
                            setIsFilterOpen(false);
                        }}
                        currentFilters={activeFilters}
                    />
                )}
            </AnimatePresence>

            <div>
                {filteredEvents.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredEvents.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-text-secondary dark:text-dark-text-secondary mt-8 p-6 bg-white dark:bg-dark-surface rounded-lg">
                        <p className="font-semibold">Ingen events fundet</p>
                        <p className="text-sm">Prøv at justere dine filtre eller kom tilbage senere.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;