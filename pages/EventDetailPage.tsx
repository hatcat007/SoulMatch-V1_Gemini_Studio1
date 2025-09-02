
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import type { Event, User, MessageThread } from '../types';
import ShareModal from '../components/ShareModal';

// --- MOCK DATA ---
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

const mockSoulmates: MessageThread[] = [
    { id: 1, user: { id: 1, name: 'Anne', age: 24, avatarUrl: 'https://picsum.photos/id/1011/100/100', online: true }, lastMessage: '', timestamp: '', unreadCount: 0 },
    { id: 2, user: { id: 4, name: 'Victoria', age: 25, avatarUrl: 'https://picsum.photos/id/1013/100/100', online: false }, lastMessage: '', timestamp: '', unreadCount: 0 },
    { id: 3, user: { id: 2, name: 'Jens', age: 26, avatarUrl: 'https://picsum.photos/id/1025/100/100', online: true }, lastMessage: '', timestamp: '', unreadCount: 0 },
];

const currentUser: User = { id: 999, name: 'Mig', age: 25, avatarUrl: 'https://i.pravatar.cc/80?u=999', online: true };

const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  
  const eventData = useMemo(() => mockEvents.find(e => e.id.toString() === eventId), [eventId]);

  const [event, setEvent] = useState<Event | undefined>(eventData);
  const [isJoined, setIsJoined] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareConfirmation, setShareConfirmation] = useState('');

  const handleToggleJoin = () => {
    if (!event) return;
    
    setIsJoined(prev => !prev);
    
    setEvent(currentEvent => {
      if (!currentEvent) return undefined;
      
      const currentParticipants = currentEvent.participants || [];
      const userExists = currentParticipants.some(p => p.id === currentUser.id);

      let newParticipants;
      if (userExists) {
        newParticipants = currentParticipants.filter(p => p.id !== currentUser.id);
      } else {
        newParticipants = [...currentParticipants, currentUser];
      }
      
      return { ...currentEvent, participants: newParticipants };
    });
  };

  const handleShare = (user: User) => {
    setShowShareModal(false);
    setShareConfirmation(`Event delt med ${user.name}!`);
    setTimeout(() => setShareConfirmation(''), 3000);
  };
  
  if (!event) {
    return (
      <div className="p-4 text-center">
        <p>Event not found.</p>
        <button onClick={() => navigate('/home')} className="text-primary mt-4">Back to home</button>
      </div>
    );
  }

  const participantsToShow = event.participants?.slice(0, 15) || [];
  const remainingParticipants = event.participants ? event.participants.length - participantsToShow.length : 0;

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="fixed top-0 left-0 right-0 z-20 bg-white bg-opacity-80 backdrop-blur-sm md:relative md:bg-transparent md:backdrop-blur-none">
          <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
              <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary">
                  <ArrowLeft size={24} />
              </button>
              <h1 className="text-xl font-bold text-text-primary">SoulMatch</h1>
              <div className="w-8"></div>
          </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-16 md:pt-4">
        <div className="md:max-w-4xl mx-auto p-4 md:p-6">
          <div className="relative p-6 rounded-3xl shadow-xl bg-gray-50 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-text-primary">{event.title}</h2>
                <p className="text-text-secondary mt-1">Host: {event.host}</p>
              </div>
              <Link to={`/organization/${event.organizationId}`} className="p-3 bg-white rounded-full border border-gray-200 text-primary hover:bg-primary-light">
                <Info size={24} />
              </Link>
            </div>
          </div>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-text-primary mb-4">Deltagere ({event.participants?.length || 0})</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {participantsToShow.map(user => (
                <div key={user.id} className="text-center">
                  <img src={user.avatarUrl} alt={user.name} className="w-16 h-16 rounded-full mx-auto object-cover" />
                  <p className="text-sm mt-2 truncate font-semibold text-text-secondary">{user.name}</p>
                </div>
              ))}
              {remainingParticipants > 0 && (
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="font-bold text-text-secondary">+{remainingParticipants}</span>
                    </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-text-primary mb-4">Beskrivelse</h3>
            <div className="bg-gray-100 p-4 rounded-xl">
              <p className="text-text-secondary whitespace-pre-line">{event.description}</p>
            </div>
          </section>
        </div>
      </main>
      
      <footer className="sticky bottom-0 bg-white border-t border-gray-200 p-4 z-10">
          <div className="max-w-4xl mx-auto md:flex md:space-x-4 space-y-3 md:space-y-0">
             <button
                onClick={() => setShowShareModal(true)}
                className="w-full md:w-auto md:flex-1 bg-primary-light text-primary font-bold py-3 px-4 rounded-full text-lg transition duration-300 hover:bg-primary/20"
            >
                Del med soulmate 😎
            </button>
            <button
                onClick={handleToggleJoin}
                className={`w-full md:w-auto md:flex-1 text-white font-bold py-3 px-4 rounded-full text-lg transition duration-300 shadow-lg ${isJoined ? 'bg-gray-500 hover:bg-gray-600' : 'bg-primary hover:bg-primary-dark'}`}
            >
                {isJoined ? 'Tilmeldt' : 'Deltag'}
            </button>
          </div>
      </footer>
       
      {showShareModal && (
        <ShareModal 
            title="Del event med en Soulmate"
            soulmates={mockSoulmates}
            onShare={handleShare}
            onClose={() => setShowShareModal(false)}
        />
      )}
       {shareConfirmation && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-bold py-2 px-4 rounded-full z-50">
              {shareConfirmation}
          </div>
      )}
    </div>
  );
};

export default EventDetailPage;
