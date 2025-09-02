

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Event, User } from '../types';
import NotificationIcon from '../components/NotificationIcon';
import { supabase } from '../services/supabase';

const EventCard: React.FC<{ event: Event }> = ({ event }) => {
    const formattedTime = event.time ? new Date(event.time).toLocaleString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }) : 'Tidspunkt ukendt';

    return (
        <div className={`p-4 rounded-2xl ${event.color} dark:bg-dark-surface shadow-sm h-full flex flex-col`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{formattedTime}</p>
                    <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mt-1">{event.title}</h3>
                </div>
                <div className="text-4xl">{event.icon}</div>
            </div>
            <div className="mt-auto pt-4 flex items-center">
                <img src={event.host_avatar_url} alt={event.host_name} className="w-8 h-8 rounded-full mr-2 object-contain" />
                <div>
                    <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{event.participantCount} deltagere</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary/70">Host: {event.host_name}</p>
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
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full object-cover shadow-md" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold shadow-md">
                  {user.name.charAt(0)}
                </div>
              )}
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

const HomePage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedCategory = searchParams.get('category');
    const [events, setEvents] = useState<Event[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select(`
                    *,
                    event_participants ( count )
                `);

            if (eventsError) {
                console.error('Error fetching events:', eventsError);
            } else {
                const eventsWithParticipantCount = eventsData.map(e => ({
                    ...e,
                    participantCount: e.event_participants?.[0]?.count || 0
                }));
                setEvents(eventsWithParticipantCount);
            }

            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .eq('online', true)
                .limit(4);

            if (usersError) {
                console.error('Error fetching online users:', usersError);
            } else {
                setOnlineUsers(usersData);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const filteredEvents = useMemo(() => {
        if (!selectedCategory) {
            return events;
        }
        return events.filter(event => event.category === selectedCategory);
    }, [selectedCategory, events]);

    if (loading) {
        return <div className="p-4 text-center">Loading...</div>;
    }

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="w-10"></div> {/* Spacer */}
                <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
                <NotificationIcon />
            </div>
            <div className="relative mb-6">
                <input
                    type="text"
                    placeholder="Søg på dine interesser eller ønsker"
                    className="w-full bg-gray-100 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-full py-3 pl-10 pr-4 text-gray-700 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-dark-text-secondary" size={20} />
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
        <Link to="/home/filter" className="p-2 bg-gray-100 dark:bg-dark-surface-light rounded-md">
            <SlidersHorizontal className="text-gray-600 dark:text-dark-text-secondary" />
        </Link>
      </div>
      
      {selectedCategory && (
        <div className="inline-flex items-center bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light font-semibold px-3 py-1.5 rounded-full mb-4 text-sm">
          <span>Filter: {selectedCategory}</span>
          <button onClick={() => setSearchParams({})} className="ml-2 p-1 -mr-1 hover:bg-primary/20 dark:hover:bg-primary/30 rounded-full">
            <X size={16} />
          </button>
        </div>
      )}

      {filteredEvents.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map(event => (
              <Link to={`/event/${event.id}`} key={event.id} className="block mb-4 md:mb-0">
                <EventCard event={event} />
              </Link>
            ))}
        </div>
      ) : (
        <p className="text-center text-text-secondary dark:text-dark-text-secondary mt-8">Ingen events fundet for den valgte kategori.</p>
      )}
    </div>
  );
};

export default HomePage;