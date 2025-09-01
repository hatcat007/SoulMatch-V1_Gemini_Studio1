
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Info } from 'lucide-react';
import type { Event, User } from '../types';

// Mock data needs to be available on this page to retrieve event details.
// In a real app, this would come from a global state or an API call.
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

const mockEvents: Event[] = [
  { id: 1, title: 'Musik koncert sammen', time: 'Lige nu', participantCount: 35, host: 'Jesper fra Studenterhuset Aalborg', hostAvatarUrl: 'https://picsum.photos/id/237/40/40', icon: '🎸', color: 'bg-yellow-100', description: 'Kom og hør Andreas Odbjerg.\nVi gir den første øl 🍺 #stopensomhed', participants: mockParticipants },
  { id: 2, title: 'Fælles spisning', time: 'Om 31 min', participantCount: 4, host: 'SIND Ungdom Aalborg', hostAvatarUrl: 'https://picsum.photos/id/238/40/40', icon: '🍽️', color: 'bg-teal-100' },
  { id: 3, title: 'Fælles brætspil', time: 'I dag klokken 18:00', participantCount: 18, host: 'Ventilen Aalborg', hostAvatarUrl: 'https://picsum.photos/id/239/40/40', icon: '🎲', color: 'bg-green-100' },
];

const EventDetailPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    
    const event = mockEvents.find(e => e.id.toString() === eventId);
    
    if (!event) {
        return (
            <div className="p-4 text-center">
                <p>Event not found.</p>
                <button onClick={() => navigate('/home')} className="text-primary mt-4">Back to home</button>
            </div>
        );
    }

    const participants = event.participants || [];
    const displayedParticipants = participants.slice(0, 15);
    const remainingCount = participants.length - displayedParticipants.length;

    return (
        <div className="flex flex-col h-full bg-gray-100 font-sans">
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

                        <h4 className="text-xl font-bold text-text-primary mb-4">Deltagere</h4>
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

                <footer className="flex-shrink-0 bg-white p-4 border-t border-gray-200 space-y-3">
                     <button className="w-full bg-primary-light text-primary font-bold py-3 px-4 rounded-full text-lg transition duration-300">
                        Del med soulmate 😎
                     </button>
                     <button className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg">
                        Deltag
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default EventDetailPage;
