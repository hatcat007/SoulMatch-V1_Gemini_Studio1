import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ImageIcon, Loader2, Users, Clock, Sparkles } from 'lucide-react';
import type { Event, User, Interest, Category, Activity } from '../types';
import NotificationIcon from '../components/NotificationIcon';
import { supabase } from '../services/supabase';
import { fetchPrivateFile } from '../services/s3Service';
import { AnimatePresence } from 'framer-motion';
import EventFilterModal, { Filters } from '../components/EventFilterModal';
import ImageSlideshow from '../components/ImageSlideshow';

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
    const eventDate = new Date(event.time);
    const month = eventDate.toLocaleString('da-DK', { month: 'short' }).replace('.', '').toUpperCase();
    const day = eventDate.getDate();
    
    const timeString = useMemo(() => {
        if (!event?.time) return 'Tidspunkt ukendt';
        const startTime = new Date(event.time);
        
        const startTimeString = startTime.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');

        let timePart = startTimeString;

        if (event.end_time) {
            const endTime = new Date(event.end_time);
            const endTimeString = endTime.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');
            timePart += ` - ${endTimeString}`;
        }
        
        return timePart;
    }, [event.time, event.end_time]);


    const DateDisplay = () => (
        <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm rounded-lg w-14 text-center py-1 shadow-md">
            <p className="text-xs font-bold text-red-500">{month}</p>
            <p className="text-2xl font-bold text-text-primary dark:text-dark-text-primary -mt-1">{day}</p>
        </div>
    );

    return (
        <div className="relative bg-white dark:bg-dark-surface rounded-2xl shadow-sm h-full flex flex-col overflow-hidden group">
            {event.image_url || (event.images && event.images.length > 0) ? (
                <div className="aspect-square overflow-hidden relative">
                    <ImageSlideshow imageUrl={event.image_url} images={event.images} alt={event.title} />
                    <div className="absolute top-3 left-3 z-10">
                        <DateDisplay />
                    </div>
                </div>
            ) : (
                <div className={`w-full h-32 flex items-center justify-between p-4 ${event.color}`}>
                    <DateDisplay />
                    <div className="text-5xl">{event.icon}</div>
                </div>
            )}
            <div className="p-4 flex flex-col flex-1">
                <div>
                    <p className="text-sm font-semibold text-primary dark:text-primary-light flex items-center"><Clock size={14} className="mr-1.5" />{timeString}</p>
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
             {!event.image_url && (
                <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg">
                    {event.icon}
                </div>
            )}
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
    const [searchTerm, setSearchTerm] = useState('');
    
    // State to hold names for interests and categories for display
    const [interestMap, setInterestMap] = useState<Map<string, string>>(new Map());
    const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
    const [activityMap, setActivityMap] = useState<Map<string, string>>(new Map());


    useEffect(() => {
        const fetchNames = async () => {
            const { data: interests } = await supabase.from('interests').select('id, name');
            if (interests) setInterestMap(new Map(interests.map(i => [i.id.toString(), i.name])));
            
            const { data: categories } = await supabase.from('categories').select('id, name');
            if (categories) setCategoryMap(new Map(categories.map(c => [c.id.toString(), c.name])));

            const { data: activities } = await supabase.from('activities').select('id, name');
            if (activities) setActivityMap(new Map(activities.map(a => [a.id.toString(), a.name])));
        };
        fetchNames();
    }, []);
    
    const currentFilters = useMemo((): Filters => ({
        categoryId: searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!, 10) : null,
        date: searchParams.get('date') || null,
        timeOfDay: (searchParams.get('timeOfDay') as Filters['timeOfDay']) || null,
        interestIds: searchParams.getAll('interests').map(Number),
        activityIds: searchParams.getAll('activities').map(Number),
        creatorType: (searchParams.get('creatorType') as Filters['creatorType']) || 'all',
    }), [searchParams]);

    const filteredEvents = useMemo(() => {
        const lowercasedSearchTerm = searchTerm.trim().toLowerCase();

        return events.filter(event => {
            // Search term filter
            if (lowercasedSearchTerm) {
                const titleMatch = event.title.toLowerCase().includes(lowercasedSearchTerm);
                const descriptionMatch = event.description?.toLowerCase().includes(lowercasedSearchTerm) ?? false;
                const interestMatch = event.interests?.some(interest => 
                    interest.name.toLowerCase().includes(lowercasedSearchTerm)
                ) ?? false;
                
                if (!titleMatch && !descriptionMatch && !interestMatch) {
                    return false; // Skip this event if no match in search
                }
            }
            
            // Modal filters
            if (currentFilters.categoryId && event.category?.id !== currentFilters.categoryId) return false;
            
            if (currentFilters.date) {
                const eventDate = new Date(event.time);
                // Adjust for timezone offset before comparing dates
                const filterDate = new Date(currentFilters.date);
                filterDate.setMinutes(filterDate.getMinutes() + filterDate.getTimezoneOffset());

                if (eventDate.getFullYear() !== filterDate.getFullYear() || eventDate.getMonth() !== filterDate.getMonth() || eventDate.getDate() !== filterDate.getDate()) {
                    return false;
                }
            }
            
            if (currentFilters.timeOfDay) {
                const eventHour = new Date(event.time).getHours();
                const { timeOfDay } = currentFilters;
                if (timeOfDay === 'morning' && (eventHour < 8 || eventHour >= 12)) return false;
                if (timeOfDay === 'afternoon' && (eventHour < 12 || eventHour >= 17)) return false;
                if (timeOfDay === 'evening' && (eventHour < 17 || eventHour >= 24)) return false;
            }
            
            if (currentFilters.creatorType !== 'all') {
                if (currentFilters.creatorType === 'user' && !event.creator_user_id) return false;
                if (currentFilters.creatorType === 'org' && !event.organization_id) return false;
            }
            
            if (currentFilters.interestIds.length > 0) {
                if (!event.interests || event.interests.length === 0) return false;
                const eventInterestIds = new Set(event.interests.map(i => i.id));
                if (!currentFilters.interestIds.every(id => eventInterestIds.has(id))) return false;
            }

            if (currentFilters.activityIds.length > 0) {
                if (!event.organization_id || !event.organization?.activities || event.organization.activities.length === 0) return false;
                const eventActivityIds = new Set(event.organization.activities.map(a => a.activity.id));
                if (!currentFilters.activityIds.every(id => eventActivityIds.has(id))) return false;
            }
            
            return true;
        });
    }, [currentFilters, events, searchTerm]);
    
    const handleApplyFilter = (filters: Filters) => {
        const newParams = new URLSearchParams();
        if (filters.categoryId) newParams.set('categoryId', filters.categoryId.toString());
        if (filters.date) newParams.set('date', filters.date);
        if (filters.timeOfDay) newParams.set('timeOfDay', filters.timeOfDay);
        if (filters.creatorType && filters.creatorType !== 'all') newParams.set('creatorType', filters.creatorType);
        filters.interestIds.forEach(id => newParams.append('interests', id.toString()));
        filters.activityIds.forEach(id => newParams.append('activities', id.toString()));
        setSearchParams(newParams);
        setIsFilterModalOpen(false);
    };

    const removeFilter = (key: string, value: string | null = null) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) { // For multi-value keys like 'interests'
            const values = newParams.getAll(key).filter(v => v !== value);
            newParams.delete(key);
            values.forEach(v => newParams.append(key, v));
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
    };

    const activeFilterPills = useMemo(() => {
        const pills: { key: string, value?: string, label: string }[] = [];
        if (currentFilters.categoryId) pills.push({ key: 'categoryId', label: `Kategori: ${categoryMap.get(currentFilters.categoryId.toString()) || '...'}` });
        if (currentFilters.date) pills.push({ key: 'date', label: `Dato: ${new Date(currentFilters.date).toLocaleDateString('da-DK')}` });
        if (currentFilters.timeOfDay) {
            const timeLabels = { morning: 'Formiddag', afternoon: 'Eftermiddag', evening: 'Aften' };
            pills.push({ key: 'timeOfDay', label: timeLabels[currentFilters.timeOfDay as keyof typeof timeLabels] });
        }
        if (currentFilters.creatorType !== 'all') {
            const creatorLabels = { user: 'Brugere', org: 'Organisationer' };
            pills.push({ key: 'creatorType', label: `Oprettet af: ${creatorLabels[currentFilters.creatorType as keyof typeof creatorLabels]}` });
        }
        currentFilters.interestIds.forEach(id => {
            pills.push({ key: 'interests', value: id.toString(), label: `Interesse: ${interestMap.get(id.toString()) || '...'}` });
        });
        currentFilters.activityIds.forEach(id => {
            pills.push({ key: 'activities', value: id.toString(), label: `Aktivitet: ${activityMap.get(id.toString()) || '...'}` });
        });
        return pills;
    }, [currentFilters, interestMap, categoryMap, activityMap]);


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
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-full py-3 pl-10 pr-10 text-gray-700 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-dark-text-secondary" size={20} />
                     {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-primary">
                            <X size={20} />
                        </button>
                    )}
                </div>
                <Link to="/friends" className="flex-shrink-0 p-3 bg-gray-100 dark:bg-dark-surface-light rounded-full text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-surface" aria-label="Venner">
                    <Users size={20} />
                </Link>
            </div>

            <OnlineNowSection users={onlineUsers} />

            <Link to="/soulmatches" className="block my-6 group">
                <div className="bg-gradient-to-r from-primary to-accent p-6 rounded-2xl shadow-lg text-white flex items-center justify-between group-hover:scale-105 transition-transform duration-300">
                    <div>
                        <h3 className="text-xl font-bold">Find dine SoulMatches</h3>
                        <p className="text-sm opacity-90">AI-drevne forslag til nye venskaber</p>
                    </div>
                    <Sparkles size={32} />
                </div>
            </Link>

      <div className="flex justify-between items-center mb-4">
        <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Undersøg nye muligheder</h2>
            <p className="text-text-secondary dark:text-dark-text-secondary text-sm">Valgt baseret på dine interesser</p>
        </div>
        <button onClick={() => setIsFilterModalOpen(true)} className="p-2 bg-gray-100 dark:bg-dark-surface-light rounded-md">
            <SlidersHorizontal className="text-gray-600 dark:text-dark-text-secondary" />
        </button>
      </div>
      
      {activeFilterPills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilterPills.map(pill => (
            <div key={pill.key + (pill.value || '')} className="inline-flex items-center bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light font-semibold pl-3 pr-2 py-1.5 rounded-full text-sm">
              <span>{pill.label}</span>
              <button onClick={() => removeFilter(pill.key, pill.value)} className="ml-2 p-0.5 hover:bg-primary/20 dark:hover:bg-primary/30 rounded-full">
                <X size={14} />
              </button>
            </div>
          ))}
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
        <p className="text-center text-text-secondary dark:text-dark-text-secondary mt-8">Ingen events fundet for de valgte filtre.</p>
      )}

      <AnimatePresence>
        {isFilterModalOpen && (
            <EventFilterModal
                onClose={() => setIsFilterModalOpen(false)}
                onApplyFilter={handleApplyFilter}
                currentFilters={currentFilters}
            />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;