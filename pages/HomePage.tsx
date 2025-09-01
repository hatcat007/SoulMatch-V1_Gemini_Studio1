
import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { Event } from '../types';
import { supabase } from '../services/supabase';

const EventCard: React.FC<{ event: Event }> = ({ event }) => (
  <div className={`p-4 rounded-2xl ${event.color} shadow-sm mb-4`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-600">{event.time}</p>
        <h3 className="text-xl font-bold text-text-primary mt-1">{event.title}</h3>
      </div>
      <div className="text-4xl">{event.icon}</div>
    </div>
    <div className="mt-4 flex items-center">
      <img src={event.hostAvatarUrl} alt={event.host} className="w-8 h-8 rounded-full mr-2" />
      <div>
        <p className="text-sm text-gray-700">{event.participantCount} deltagere</p>
        <p className="text-xs text-gray-500">Host: {event.host}</p>
      </div>
    </div>
  </div>
);

const HomePage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        setError('Kunne ikke hente events. Prøv igen senere.');
        console.error('Error fetching events:', error);
      } else if (data) {
        const formattedData: Event[] = data.map(event => ({
          id: event.id,
          title: event.title,
          time: event.time,
          participantCount: event.participant_count,
          host: event.host,
          hostAvatarUrl: event.host_avatar_url,
          icon: event.icon,
          color: event.color,
        }));
        setEvents(formattedData);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Henter events...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <div className="relative mb-6">
        <input 
          type="text" 
          placeholder="Søg på dine interesser eller ønsker" 
          className="w-full bg-gray-100 border border-gray-200 rounded-full py-3 pl-10 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
      </div>

      <h2 className="text-2xl font-bold text-text-primary mb-2">Undersøg nye muligheder</h2>
      <p className="text-text-secondary mb-6">Valgt baseret på dine interesser</p>
      
      {events.length > 0 && (
        <div>
          <EventCard event={events[0]} />
        </div>
      )}

      <h2 className="text-xl font-bold text-text-primary my-4">Sker senere i dag</h2>
      <div>
        {events.slice(1).map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
