
import React from 'react';
import { Search } from 'lucide-react';
import type { Event } from '../types';

const mockEvents: Event[] = [
  { id: 1, title: 'Musik koncert sammen', time: 'Lige nu', participantCount: 9, host: 'Jesper fra Studenterhuset Aalborg', hostAvatarUrl: 'https://picsum.photos/id/237/40/40', icon: '🎸', color: 'bg-yellow-100' },
  { id: 2, title: 'Fælles spisning', time: 'Om 31 min', participantCount: 4, host: 'SIND Ungdom Aalborg', hostAvatarUrl: 'https://picsum.photos/id/238/40/40', icon: '🍽️', color: 'bg-teal-100' },
  { id: 3, title: 'Fælles brætspil', time: 'I dag klokken 18:00', participantCount: 18, host: 'Ventilen Aalborg', hostAvatarUrl: 'https://picsum.photos/id/239/40/40', icon: '🎲', color: 'bg-green-100' },
];

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
      
      <div>
        <EventCard event={mockEvents[0]} />
      </div>

      <h2 className="text-xl font-bold text-text-primary my-4">Sker senere i dag</h2>
      <div>
        {mockEvents.slice(1).map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
