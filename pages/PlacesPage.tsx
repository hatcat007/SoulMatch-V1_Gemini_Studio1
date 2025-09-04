import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Phone, Clock, MapPin, Share2, CheckSquare, ImageIcon, Users } from 'lucide-react';
import type { Place, User, MessageThread } from '../types';
import ShareModal from '../components/ShareModal';
import ImageSlideshow from '../components/ImageSlideshow';
import NotificationIcon from '../components/NotificationIcon';
import { supabase } from '../services/supabase';
import { fetchPrivateFile } from '../services/s3Service';

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

    if(loading) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light animate-pulse`} />;
    if(!imageUrl) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light flex items-center justify-center`}><ImageIcon className="text-gray-400" /></div>;

    return <img src={imageUrl} alt={alt} className={className} />;
};


const PlaceCard: React.FC<{ place: Place }> = ({ place }) => (
    <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl shadow-sm h-full cursor-pointer hover:shadow-lg transition-shadow flex items-center">
        <div className="w-20 h-20 flex-shrink-0 mr-4">
             <PrivateImage src={place.image_url} alt={place.name} className="w-full h-full object-cover rounded-lg" />
        </div>
        <div className="flex-1">
            <p className="font-semibold text-primary">{place.offer}</p>
            <h3 className="text-lg font-bold text-text-primary dark:text-dark-text-primary line-clamp-2">{place.name}</h3>
            <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{place.address}</p>
            <div className="flex items-center text-xs text-text-secondary dark:text-dark-text-secondary mt-2 space-x-3">
                <p className="font-semibold">{place.category?.name || 'Ukendt'}</p>
                {place.user_count > 0 && (
                    <div className="flex items-center text-gray-500 dark:text-dark-text-secondary/80">
                        <Users size={14} className="mr-1" />
                        <span className="font-medium">Ca. {place.user_count}</span>
                    </div>
                )}
            </div>
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
            Kom sammen med eventet: <span className="text-primary">{place.name}</span>
          </h2>
          {place.organization && (
            <p className="text-sm text-text-secondary mt-1">
              - I samarbejde om kampen om ensomhed med{' '}
              <Link to={`/organization/${place.organization.id}`} className="font-semibold text-primary hover:underline">
                {place.organization.name}
              </Link>
            </p>
          )}
        </header>

        <main className="overflow-y-auto pb-4">
            <div className="mb-4">
                <ImageSlideshow images={place.images} alt={place.name} />
            </div>

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
    const selectedCategoryId = searchParams.get('category_id');
    const [places, setPlaces] = useState<Place[]>([]);
    const [soulmates, setSoulmates] = useState<MessageThread[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareConfirmation, setShareConfirmation] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchPlaces = async () => {
        const { data, error } = await supabase.from('places').select('*, images:place_images(id, image_url), organization:organizations(id, name), category:categories(*)');
        if (error) {
            console.error('Error fetching places:', error);
            return [];
        }
        return (data || []) as Place[];
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'places' }, async (payload) => {
                const updatedPlaces = await fetchPlaces();
                setPlaces(updatedPlaces);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredPlaces = useMemo(() => {
        if (!selectedCategoryId) {
            return places;
        }
        return places.filter(place => place.category?.id === parseInt(selectedCategoryId, 10));
    }, [selectedCategoryId, places]);
    
    const selectedCategoryName = useMemo(() => {
        if (!selectedCategoryId) return null;
        const place = places.find(p => p.category?.id === parseInt(selectedCategoryId, 10));
        return place?.category?.name || null;
    }, [selectedCategoryId, places]);


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

            {selectedCategoryId && selectedCategoryName && (
                <div className="inline-flex items-center bg-primary-light text-primary-dark font-semibold px-3 py-1.5 rounded-full mb-4 text-sm">
                    <span>Filter: {selectedCategoryName}</span>
                    <button onClick={() => setSearchParams({})} className="ml-2 p-1 -mr-1 hover:bg-primary/20 rounded-full">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div>
                {loading ? (
                    <div className="text-center p-8">Loading places...</div>
                ) : filteredPlaces.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
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