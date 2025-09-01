import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Info } from 'lucide-react';
import type { Event, User, MessageThread } from '../types';
import ShareModal from '../components/ShareModal';

// --- MOCK DATA ---
// This data would typically come from a global state or API.

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

// FIX: Added missing 'category' property to each event to conform to the Event type.
const mockEvents: Event[] = [
  { id: 1, title: 'Musik koncert sammen', time: 'Lige nu', participantCount: 35, host: 'Jesper fra Studenterhuset Aalborg', hostAvatarUrl: 'https://picsum.photos/id/237/40/40', icon: '🎸', color: 'bg-yellow-100', category: 'Musik', description: 'Kom og hør Andreas Odbjerg.\nVi gir den første øl 🍺 #stopensomhed', participants: mockParticipants },
  { id: 2, title: 'Fælles spisning', time: 'Om 31 min', participantCount: 4, host: 'SIND Ungdom Aalborg', hostAvatarUrl: 'https://picsum.photos/id/238/40/40', icon: '🍽️', color: 'bg-teal-100', category: 'Mad', description: 'Vi mødes til en hyggelig aften med god mad og snak. Alle er velkomne, og vi laver maden sammen. Medbring godt humør!', participants: mockParticipants2 },
  { id: 3, title: 'Fælles brætspil', time: 'I dag klokken 18:00', participantCount: 18, host: 'Ventilen Aalborg', hostAvatarUrl: 'https://picsum.photos/id/239/40/40', icon: '🎲', color: 'bg-green-100', category: 'Brætspil', description: 'Er du til Settlers, Bezzerwizzer eller noget helt tredje? Kom og vær med til en aften i brætspillets tegn. Vi har masser af spil, men tag også gerne dit eget yndlingsspil med.', participants: mockParticipants3 },
];

const mockSoulmates: MessageThread[] = [
    { id: 1, user: { id: 1, name: 'Anne', age: 24, avatarUrl: 'https://picsum.photos/id/1011/100/100', online: true }, lastMessage: '', timestamp: '', unreadCount: 0 },
    { id: 2, user: { id: 4, name: 'Victoria', age: 25, avatarUrl: 'https://picsum.photos/id/1013/100/100', online: false }, lastMessage: '', timestamp: '', unreadCount: 0 },
    { id: 3, user: { id: 2, name: 'Jens', age: 26, avatarUrl: 'https://picsum.photos/id/1025/100/100', online: true }, lastMessage: '', timestamp: '', unreadCount: 0 },
    { id: 4, user: { id: 3, name: 'Sofie', age: 22, avatarUrl: 'https://picsum.photos/id/1012/100/100', online: true }, lastMessage: '', timestamp: '', unreadCount: 0 },
];

const currentUser: User = { id: 999, name: 'Dig', age: 25, avatarUrl: 'https://i.pravatar.cc/80?u=999', online: true };

// --- COMPONENTS ---

const EventDetailPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    
    const [isJoined, setIsJoined] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareConfirmation, setShareConfirmation] = useState('');

    const event = mockEvents.find(e => e.id.toString() === eventId);
    
    const participants = useMemo(() => {
        const baseParticipants = event?.participants || [];
        if (isJoined) {
            // Add current user and remove potential duplicates if they were already in the list
            return [currentUser, ...baseParticipants.filter(p => p.id !== currentUser.id)];
        }
        return baseParticipants;
    }, [isJoined, event?.participants]);

    if (!event) {
        return (
            <div className="p-4 text-center">
                <p>Event not found.</p>
                <button onClick={() => navigate('/home')} className="text-primary mt-4">Back to home</button>
            </div>
        );
    }

    const handleJoinToggle = () => setIsJoined(prev => !prev);

    const handleShare = (user: User) => {
        setShowShareModal(false);
        setShareConfirmation(`Event delt med ${user.name}!`);
        // In a real app, this would trigger a chat message send action
        setTimeout(() => setShareConfirmation(''), 3000); // Hide message after 3s
    };

    const displayedParticipants = participants.slice(0, 15);
    const remainingCount = participants.length - displayedParticipants.length;

    return (
        <div className="flex flex-col h-full bg-gray-100 font-sans">
             {showShareModal && (
                <ShareModal 
                    title="Del event med en Soulmate"
                    soulmates={mockSoulmates}
                    onShare={handleShare}
                    onClose={() => setShowShareModal(false)}
                />
            )}
            <header className="flex-shrink-0 bg-gray-100 z-10">
                <div className="p-4 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2" aria-label="Go back">
                        <ArrowLeft size={24} className="text-text-primary" />
                    </button>
                    <h1 className="text-2xl font-bold text-text-primary">SoulMatch</h1>
                    <div className="w-8"></div> {/* Spacer for alignment */}
                </div>
                 <div className="px-4 pb-4">
                     <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Søg på dine interesser eller ønsker" 
                          className="w-full bg-white border border-gray-300 rounded-lg py-3 pl-10 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                          aria-label="Search interests"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                     </div>
                </div>
                 <div className="px-4 pb-4">
                    <h2 className="text-2xl font-bold text-text-primary mb-1">Ensom? Undersøg nye muligheder</h2>
                    <p className="text-text-secondary">Valgt baseret på dine venners interesse</p>
                </div>
            </header>

            <div className="flex-1 flex flex-col bg-white rounded-t-3xl shadow-lg overflow-hidden">
                <main className="flex-1 overflow-y-auto relative pb-8">
                    <div className="sticky top-0 bg-white pt-2 flex justify-center z-10">
                        <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>
                    </div>
                    <div className="p-6 pt-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-3xl font-bold text-text-primary">{event.title}</h3>
                                <p className="text-text-secondary mt-1">Host: {event.host}</p>
                            </div>
                            <button className="p-2 border-2 border-primary rounded-full text-primary" aria-label="More info">
                                <Info size={24}/>
                            </button>
                        </div>

                        <h4 className="text-xl font-bold text-text-primary mb-4">Deltagere ({participants.length})</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-6">
                            {displayedParticipants.map(user => (
                                <div key={user.id} className="flex items-center">
                                    <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full mr-3"/>
                                    <div>
                                        <p className="font-bold">{user.name}</p>
                                        <p className="text-sm text-text-secondary">{user.age} år</p>
                                    </div>
                                </div>
                            ))}
                            {remainingCount > 0 && (
                                 <div className="flex items-center pl-3">
                                    <p className="text-text-primary font-semibold whitespace-nowrap">+ {remainingCount} flere</p>
                                 </div>
                            )}
                        </div>

                         <h4 className="text-xl font-bold text-text-primary mb-4">Beskrivelse</h4>
                         <div className="bg-gray-100 p-4 rounded-xl">
                            <p className="text-text-primary whitespace-pre-line">{event.description || 'No description available.'}</p>
                         </div>
                    </div>
                </main>

                <footer className="flex-shrink-0 bg-white p-4 border-t border-gray-200 space-y-3 relative">
                     {shareConfirmation && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-green-500 text-white text-sm font-bold py-2 px-4 rounded-full">
                            {shareConfirmation}
                        </div>
                    )}
                     <button onClick={() => setShowShareModal(true)} className="w-full bg-primary-light text-primary font-bold py-3 px-4 rounded-full text-lg transition duration-300 hover:bg-gray-200">
                        Del med soulmate 😎
                     </button>
                     <button 
                        onClick={handleJoinToggle} 
                        className={`w-full font-bold py-3 px-4 rounded-full text-lg transition duration-300 shadow-lg ${isJoined ? 'bg-gray-200 text-gray-800' : 'bg-primary text-white hover:bg-primary-dark'}`}
                    >
                        {isJoined ? 'Tilmeldt' : 'Deltag'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default EventDetailPage;