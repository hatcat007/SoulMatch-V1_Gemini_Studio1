import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Phone, Clock, MapPin, Share2, CheckSquare } from 'lucide-react';
import type { Place, User, MessageThread } from '../types';
import ShareModal from '../components/ShareModal';
import NotificationIcon from '../components/NotificationIcon';
import { supabase } from '../services/supabase';

const PlaceCard: React.FC<{ place: Place }> = ({ place }) => (
    <div className="bg-teal-100 p-4 rounded-2xl shadow-sm h-full cursor-pointer hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-semibold text-teal-800">{place.offer}</p>
                <h3 className="text-2xl font-bold text-text-primary">{place.name}</h3>
            </div>
            <div className="text-4xl bg-white p-2 rounded-full">{place.icon}</div>
        </div>
        <div className="mt-4">
            <div className="flex items-center">
                <div className="flex -space-x-2 mr-2">
                    {(place.user_images || []).map((src, index) => (
                        <img key={index} src={src} alt="user" className="w-8 h-8 rounded-full border-2 border-white"/>
                    ))}
                </div>
                <p className="text-sm text-teal-700">{place.user_count || 0} har mødes her</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">{place.address}</p>
        </div>
    </div>
);

const PlaceDetailModal: React.FC<{ place: Place, onClose: () => void, onShare: () => void }> = ({ place, onClose, onShare }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center md:justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-6 relative max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-gray-300 rounded-full md:hidden"></div>
        
        <header className="text-center mt-4 mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold text-text-primary">
            I kampen sammen om ensomhed tilbyder <br/> <span className="text-primary">{place.name}</span> jer
          </h2>
        </header>

        <main className="overflow-y-auto pb-4">
            <div className="mb-6 space-y-3">
              <h3 className="text-lg font-bold text-text-primary border-b pb-2 mb-2">Detaljer om mødetilbuddet</h3>
              <p className="font-bold text-lg text-primary">{place.offer}</p>
              <p className="text-sm text-gray-600">{place.description}</p>
              <div className={`text-sm font-bold p-2 rounded-lg text-center ${place.is_sponsored ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                Sponsoreret: {place.is_sponsored ? 'JA' : 'NEJ'}
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <h3 className="text-lg font-bold text-text-primary border-b pb-2 mb-2">Kontaktinformation</h3>
              <div className="flex items-center text-gray-700">
                <Phone size={18} className="mr-3 text-primary flex-shrink-0" />
                <span>{place.phone}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Clock size={18} className="mr-3 text-primary flex-shrink-0" />
                <span>{place.opening_hours}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <MapPin size={18} className="mr-3 text-primary flex-shrink-0" />
                <span>{place.address}</span>
              </div>
            </div>
        </main>
        
        <footer className="space-y-3 border-t pt-4 mt-auto flex-shrink-0">
          <button onClick={onShare} className="w-full bg-primary-light text-primary font-bold py-3 px-4 rounded-full text-lg transition duration-300 flex items-center justify-center hover:bg-primary/20">
            <Share2 size={20} className="mr-2"/> Del med SoulMate
          </button>
          <button 
            onClick={() => navigate('/checkin', { state: { place } })}
            className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg transition duration-300 shadow-lg hover:bg-primary-dark flex items-center justify-center"
          >
            <CheckSquare size={20} className="mr-2"/> Check ind
          </button>
        </footer>
      </div>
    </div>
  );
};


const PlacesPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedCategory = searchParams.get('category');
    const [places, setPlaces] = useState<Place[]>([]);
    const [soulmates, setSoulmates] = useState<MessageThread[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareConfirmation, setShareConfirmation] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchPlaces = async () => {
        const { data, error } = await supabase.from('places').select('*');
        if (error) {
            console.error('Error fetching places:', error);
            return [];
        }
        return data || [];
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            const placesData = await fetchPlaces();
            setPlaces(placesData);

            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: userProfile } = await supabase.from('users').select('id').eq('auth_id', authUser.id).single();
                if (userProfile) {
                    const { data: threadParticipants } = await supabase.from('message_thread_participants').select('thread_id').eq('user_id', userProfile.id);
                    if (threadParticipants && threadParticipants.length > 0) {
                        const threadIds = threadParticipants.map(tp => tp.thread_id);
                        const { data: soulmateParticipants } = await supabase.from('message_thread_participants').select('user:users(*)').in('thread_id', threadIds).neq('user_id', userProfile.id);
                        
                        if (soulmateParticipants) {
                            const uniqueSoulmates = new Map<number, User>();
                            soulmateParticipants.forEach(p => {
                                const userObject = Array.isArray(p.user) ? p.user[0] : p.user;
                                if (userObject) {
                                    uniqueSoulmates.set(userObject.id, userObject);
                                }
                            });
                            
                            const threads: MessageThread[] = Array.from(uniqueSoulmates.values()).map((u: User) => ({
                                id: u.id, participants: [{ user: u }], last_message: '', timestamp: '', unread_count: 0
                            }));
                            setSoulmates(threads);
                        }
                    }
                }
            }
            setLoading(false);
        };
        fetchInitialData();

        const channel = supabase.channel('realtime places')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'places' }, (payload) => {
                setPlaces(currentPlaces => [payload.new as Place, ...currentPlaces]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredPlaces = useMemo(() => {
        if (!selectedCategory) {
            return places;
        }
        return places.filter(place => place.category === selectedCategory);
    }, [selectedCategory, places]);

    const handleShare = (user: User) => {
        setShowShareModal(false);
        setShareConfirmation(`Sted delt med ${user.name}!`);
        setTimeout(() => setShareConfirmation(''), 3000);
    };


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
                    placeholder="Søg på dine ønsker. Fx Kaffe eller Øl" 
                    className="w-full bg-gray-100 border border-gray-200 rounded-full py-3 pl-10 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Steder at mødes</h2>
                    <p className="text-text-secondary text-sm">Valgt baseret på din lokation</p>
                </div>
                <Link to="/places/filter" className="p-2 bg-gray-100 rounded-md">
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

            <div>
                {loading ? (
                    <div className="text-center p-8">Loading places...</div>
                ) : filteredPlaces.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPlaces.map(place => (
                            <div key={place.id} onClick={() => setSelectedPlace(place)}>
                                <PlaceCard place={place} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-text-secondary mt-8">Ingen steder fundet for den valgte kategori.</p>
                )}
            </div>

            {selectedPlace && (
                <PlaceDetailModal 
                    place={selectedPlace} 
                    onClose={() => setSelectedPlace(null)}
                    onShare={() => setShowShareModal(true)}
                />
            )}
            {showShareModal && (
                <ShareModal 
                    title="Del sted med en Soulmate"
                    soulmates={soulmates}
                    onShare={handleShare}
                    onClose={() => setShowShareModal(false)}
                />
            )}
             {shareConfirmation && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-bold py-2 px-4 rounded-full z-50">
                    {shareConfirmation}
                </div>
            )}
        </div>
    );
};

export default PlacesPage;