import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Event, User } from '../types';

const mockOnlineNowUsers: User[] = [
  { id: 101, name: 'Chris', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=101', online: true },
  { id: 103, name: 'Jens', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=103', online: true },
  { id: 105, name: 'Ib', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=105', online: true },
  { id: 113, name: 'Anna', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=113', online: true },
];

const mockParticipants: User[] = [
  { id: 101, name: 'Chris', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=101', online: true },
  { id: 102, name: 'Søren', age: 22, avatarUrl: 'https://i.pravatar.cc/80?u=102', online: false },
  { id: 103, name: 'Jens', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=103', online: true },
  { id: 104, name: 'Chris', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=104', online: false },
  { id: 105, name: 'Ib', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=105', online: true },
  { id: 106, name: 'Per', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=106', online: true },
  { id: 107, name: 'Ole', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=107', online: false },
  { id: 108, name: 'Chris', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=108', online: true },
  { id: 109, name: 'Chris', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=109', online: false },
  { id: 110, name: 'Chris', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=110', online: true },
  { id: 111, name: 'Chris', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=111', online: false },
  { id: 112, name: 'Chris', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=112', online: true },
  { id: 113, name: 'Anna', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=113', online: true },
  { id: 114, name: 'Ana', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=114', online: false },
  { id: 115, name: 'Britta', age: 20, avatarUrl: 'https://i.pravatar.cc/80?u=115', online: true },
  ...Array.from({ length: 20 }, (_, i) => ({ id: 200 + i, name: `User ${i}`, age: 21, avatarUrl: `https://i.pravatar.cc/80?u=${200 + i}`, online: false })),
];

const mockParticipants2: User[] = [
  { id: 301, name: 'Mette', age: 24, avatarUrl: 'https://i.pravatar.cc/80?u=301', online: true },
  { id: 302, name: 'Lars', age: 28, avatarUrl: 'https://i.pravatar.cc/80?u=302', online: false },
  { id: 303, name: 'Freja', age: 21, avatarUrl: 'https://i.pravatar.cc/80?u=303', online: true },
  { id: 304, name: 'Emil', age: 23, avatarUrl: 'https://i.pravatar.cc/80?u=304', online: false },
];

const mockParticipants3: User[] = [
  { id: 401, name: 'Peter', age: 30, avatarUrl: 'https://i.pravatar.cc/80?u=401', online: true },
  { id: 402, name: 'Signe', age: 26, avatarUrl: 'https://i.pravatar.cc/80?u=402', online: true },
  { id: 403, name: 'Martin', age: 29, avatarUrl: 'https://i.pravatar.cc/80?u=403', online: false },
  ...Array.from({ length: 15 }, (_, i) => ({ id: 500 + i, name: `Player ${i}`, age: 25, avatarUrl: `https://i.pravatar.cc/80?u=${500 + i}`, online: false })),
];

const mockParticipants4: User[] = Array.from({ length: 8 }, (_, i) => ({ id: 600 + i, name: `Walker ${i}`, age: 27, avatarUrl: `https://i.pravatar.cc/80?u=${600 + i}`, online: Math.random() > 0.5 }));
const mockParticipants5: User[] = Array.from({ length: 22 }, (_, i) => ({ id: 700 + i, name: `Cinephile ${i}`, age: 24, avatarUrl: `https://i.pravatar.cc/80?u=${700 + i}`, online: Math.random() > 0.5 }));
const mockParticipants6: User[] = Array.from({ length: 15 }, (_, i) => ({ id: 800 + i, name: `Artist ${i}`, age: 29, avatarUrl: `https://i.pravatar.cc/80?u=${800 + i}`, online: Math.random() > 0.5 }));
const mockParticipants7: User[] = Array.from({ length: 12 }, (_, i) => ({ id: 900 + i, name: `Runner ${i}`, age: 31, avatarUrl: `https://i.pravatar.cc/80?u=${900 + i}`, online: Math.random() > 0.5 }));
const mockParticipants8: User[] = Array.from({ length: 6 }, (_, i) => ({ id: 1000 + i, name: `CoffeeLover ${i}`, age: 26, avatarUrl: `https://i.pravatar.cc/80?u=${1000 + i}`, online: Math.random() > 0.5 }));


const mockEvents: Event[] = [
  { id: 1, title: 'Musik koncert sammen', time: 'Lige nu', participantCount: 35, host: 'Jesper fra Studenterhuset Aalborg', hostAvatarUrl: 'https://picsum.photos/id/237/40/40', icon: '🎸', color: 'bg-yellow-100', category: 'Musik', description: 'Kom og hør Andreas Odbjerg.\nVi gir den første øl 🍺 #stopensomhed', participants: mockParticipants, organizationId: 2 },
  { id: 2, title: 'Fælles spisning', time: 'Om 31 min', participantCount: 4, host: 'SIND Ungdom Aalborg', hostAvatarUrl: 'https://i.imgur.com/8S8V5c2.png', icon: '🍽️', color: 'bg-teal-100', category: 'Mad', description: 'Vi mødes til en hyggelig aften med god mad og snak. Alle er velkomne, og vi laver maden sammen. Medbring godt humør!', participants: mockParticipants2, organizationId: 1 },
  { id: 3, title: 'Fælles brætspil', time: 'I dag klokken 18:00', participantCount: 18, host: 'Ventilen Aalborg', hostAvatarUrl: 'https://picsum.photos/id/239/40/40', icon: '🎲', color: 'bg-green-100', category: 'Brætspil', description: 'Er du til Settlers, Bezzerwizzer eller noget helt tredje? Kom og vær med til en aften i brætspillets tegn. Vi har masser af spil, men tag også gerne dit eget yndlingsspil med.', participants: mockParticipants3, organizationId: 3 },
  { id: 4, title: 'Gåtur i Kildeparken', time: 'I morgen kl. 14:00', participantCount: 8, host: 'Aalborg Gå-klub', hostAvatarUrl: 'https://picsum.photos/id/40/40/40', icon: '🚶‍♀️', color: 'bg-blue-100', category: 'Gåtur', description: 'En afslappende gåtur i smukke omgivelser. Vi mødes ved hovedindgangen og går en tur i roligt tempo.', participants: mockParticipants4, organizationId: 1 },
  { id: 5, title: 'Biograf aften: Ny storfilm', time: 'Fredag kl. 20:00', participantCount: 22, host: 'Filmklubben', hostAvatarUrl: 'https://picsum.photos/id/50/40/40', icon: '🎬', color: 'bg-indigo-100', category: 'Biograf', description: 'Vi skal se den nyeste blockbuster! Popcorn er et must. Vi mødes i foyeren kl. 19:45.', participants: mockParticipants5, organizationId: 2 },
  { id: 6, title: 'Kreativt Værksted', time: 'Lørdag kl. 12:00', participantCount: 15, host: 'Kunst & Håndværk', hostAvatarUrl: 'https://picsum.photos/id/60/40/40', icon: '🎨', color: 'bg-purple-100', category: 'Kultur', description: 'Slip din indre kunstner løs. Vi maler, tegner og hygger os. Alle materialer er til rådighed.', participants: mockParticipants6, organizationId: 3 },
  { id: 7, title: 'Løbeklub for begyndere', time: 'Hver onsdag kl. 17:30', participantCount: 12, host: 'Aalborg Løberne', hostAvatarUrl: 'https://picsum.photos/id/70/40/40', icon: '💪', color: 'bg-orange-100', category: 'Træning', description: 'En løbetur for alle, der vil i gang. Vi løber 3-5 km i et tempo, hvor alle kan være med.', participants: mockParticipants7, organizationId: 2 },
  { id: 8, title: 'Café hygge', time: 'Søndag eftermiddag', participantCount: 6, host: 'Kaffeklubben', hostAvatarUrl: 'https://picsum.photos/id/80/40/40', icon: '☕', color: 'bg-amber-100', category: 'Mad', description: 'Lad os mødes til en kop kaffe og en god snak på en hyggelig café i centrum.', participants: mockParticipants8, organizationId: 1 },
];

const EventCard: React.FC<{ event: Event }> = ({ event }) => (
  <div className={`p-4 rounded-2xl ${event.color} shadow-sm h-full flex flex-col`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-600">{event.time}</p>
        <h3 className="text-xl font-bold text-text-primary mt-1">{event.title}</h3>
      </div>
      <div className="text-4xl">{event.icon}</div>
    </div>
    <div className="mt-auto pt-4 flex items-center">
      <img src={event.hostAvatarUrl} alt={event.host} className="w-8 h-8 rounded-full mr-2 object-contain" />
      <div>
        <p className="text-sm text-gray-700">{event.participantCount} deltagere</p>
        <p className="text-xs text-gray-500">Host: {event.host}</p>
      </div>
    </div>
  </div>
);

const OnlineNowSection: React.FC<{ users: User[] }> = ({ users }) => (
  <div className="bg-primary-light p-4 rounded-2xl mb-6">
    <h2 className="text-xl font-bold text-text-primary mb-4">Online nu</h2>
    <div className="flex justify-around">
      {users.map(user => (
        <div key={user.id} className="flex flex-col items-center text-center w-16">
          <div className="relative">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div 
                className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold"
              >
                {user.name.charAt(0)}
              </div>
            )}
            <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-primary-light"></span>
          </div>
          <p className="mt-2 text-sm font-semibold text-text-secondary truncate w-full">{user.name}</p>
        </div>
      ))}
    </div>
  </div>
);

const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category');

  const filteredEvents = useMemo(() => {
    if (!selectedCategory) {
      return mockEvents;
    }
    return mockEvents.filter(event => event.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-center text-2xl font-bold text-primary mb-4">SoulMatch</h1>
      <div className="relative mb-6">
        <input 
          type="text" 
          placeholder="Søg på dine interesser eller ønsker" 
          className="w-full bg-gray-100 border border-gray-200 rounded-full py-3 pl-10 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
      </div>

      <OnlineNowSection users={mockOnlineNowUsers.slice(0, 4)} />

      <div className="flex justify-between items-center mb-4">
        <div>
            <h2 className="text-2xl font-bold text-text-primary">Undersøg nye muligheder</h2>
            <p className="text-text-secondary text-sm">Valgt baseret på dine interesser</p>
        </div>
        <Link to="/home/filter" className="p-2 bg-gray-100 rounded-md">
            <SlidersHorizontal className="text-gray-600" />
        </Link>
      </div>
      
      {selectedCategory && (
        <div className="inline-flex items-center bg-primary-light text-primary-dark font-semibold px-3 py-1.5 rounded-full mb-4 text-sm">
          <span>Filter: {selectedCategory}</span>
          <button onClick={() => setSearchParams({})} className="ml-2 p-1 -mr-1 hover:bg-primary/20 rounded-full">
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
        <p className="text-center text-text-secondary mt-8">Ingen events fundet for den valgte kategori.</p>
      )}
    </div>
  );
};

export default HomePage;