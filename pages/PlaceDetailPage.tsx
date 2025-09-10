import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Info, Ticket, MapPin, Users, Phone, Clock, Share2, CheckSquare, Award } from 'lucide-react';
import type { Place, User, MessageThread, Activity, Interest } from '../types';
import ShareModal from '../components/ShareModal';
import ImageSlideshow from '../components/ImageSlideshow';
import { supabase } from '../services/supabase';
import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';
import SoulmatchCertification from '../components/SoulmatchCertification';

const PlaceDetailPage: React.FC = () => {
    const { placeId } = useParams<{ placeId: string }>();
    const navigate = useNavigate();
    const [place, setPlace] = useState<Place | null>(null);
    const { user: currentUser, loading: authLoading } = useAuth();
    const [soulmates, setSoulmates] = useState<MessageThread[]>([]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareConfirmation, setShareConfirmation] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCertification, setShowCertification] = useState(false);
    
    const allTags = useMemo(() => {
        if (!place) return [];
        const activityNames = place.place_activities?.map(pa => pa.activity) || [];
        const interestNames = place.place_interests?.map(pi => pi.interest) || [];
        const combined = [...activityNames, ...interestNames];
        const uniqueMap = new Map();
        combined.forEach(item => {
            if (item) uniqueMap.set(item.id, item);
        });
        return Array.from(uniqueMap.values());
    }, [place]);

    const fetchInitialData = useCallback(async () => {
        if (!placeId) return;
        if (!currentUser) {
            if (!authLoading) navigate('/login');
            return;
        }
        setLoading(true);

        const { data, error } = await supabase
            .from('places')
            .select('*, images:place_images(id, image_url), organization:organizations(id, name), category:categories(*), place_activities:place_activities(activity:activities(*)), place_interests:place_interests(interest:interests(*))')
            .eq('id', placeId)
            .single();
        
        if (error) {
            console.error('Error fetching place details:', error.message);
            setPlace(null);
        } else {
            setPlace(data as Place);
            if (data.is_certified) {
                setShowCertification(true);
            }
        }
        
        const { data: threadParticipants } = await supabase.from('message_thread_participants').select('thread_id').eq('user_id', currentUser.id);
        if (threadParticipants && threadParticipants.length > 0) {
            const threadIds = threadParticipants.map(tp => tp.thread_id);
            // FIX: The Supabase query was updated to include 'is_event_chat' and the data processing logic was corrected
            // to handle the nested array structure for users returned by the join, fixing multiple TypeScript errors.
            const { data: threadsData } = await supabase.from('message_threads').select('id, is_event_chat, participants:message_thread_participants(user:users(*))').in('id', threadIds);
            
            if (threadsData) {
                const soulmateThreads: MessageThread[] = threadsData
                    .filter(thread => !thread.is_event_chat) // Filter out event chats
                    .map(thread => {
                        const otherParticipantData = thread.participants.find(p => {
                            const participantUser = Array.isArray(p.user) ? p.user[0] : p.user;
                            return participantUser && participantUser.id !== currentUser.id;
                        });

                        if (otherParticipantData?.user) {
                            const otherUser = Array.isArray(otherParticipantData.user) ? otherParticipantData.user[0] : otherParticipantData.user;
                            if (otherUser) {
                                return { 
                                    id: thread.id, 
                                    participants: [{ user: otherUser }], 
                                    last_message: '', 
                                    timestamp: '', 
                                    unread_count: 0 
                                };
                            }
                        }
                        return null;
                    }).filter((t): t is MessageThread => t !== null);
                
                const uniqueThreads = Array.from(new Map(soulmateThreads.map(t => [t.participants[0].user.id, t])).values());
                setSoulmates(uniqueThreads);
            }
        }

        setLoading(false);
    }, [placeId, navigate, currentUser, authLoading]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);
    
    const handleShare = async (thread: MessageThread) => {
        setShowShareModal(false);
        if (!place || !currentUser) return;
        const user = thread.participants[0].user;
        const threadId = thread.id;
        const messageText = `Jeg har tænkt på ${place.name}. Kunne det være et hyggeligt sted for os at mødes? 😊`;
        
        const card_data = {
            type: 'place' as const, id: place.id, title: place.name, image_url: place.image_url || place.images?.[0]?.image_url,
            offer: place.offer, address: place.address,
        };

        const { error } = await supabase.from('messages').insert({ thread_id: threadId, sender_id: currentUser.id, text: messageText, card_data: card_data });
        
        if (error) setShareConfirmation(`Fejl: Kunne ikke dele med ${user.name}.`);
        else setShareConfirmation(`Sted delt med ${user.name}!`);
        setTimeout(() => setShareConfirmation(''), 3000);
    };

    if (authLoading || loading) return <LoadingScreen message="Indlæser mødested..." />;
    if (!place) return <div className="p-4 text-center"><p>Mødested ikke fundet.</p><button onClick={() => navigate('/places')} className="text-primary mt-4">Tilbage til steder</button></div>;
    
    if (showCertification) {
        return <SoulmatchCertification onClose={() => setShowCertification(false)} />;
    }

    return (
        <div className="flex flex-col h-full bg-background dark:bg-dark-background">
            <header className="fixed top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md md:relative md:bg-transparent md:backdrop-blur-none dark:bg-dark-surface/90 dark:md:bg-transparent border-b border-gray-100 dark:border-dark-border md:border-0">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary dark:text-dark-text-primary hover:bg-primary-light dark:hover:bg-dark-surface-light rounded-full transition-colors"><ArrowLeft size={24} /></button>
                    <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Mødested</h1>
                    <div className="w-8"></div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                <div className="relative">
                    <ImageSlideshow imageUrl={place.image_url} images={place.images} alt={place.name} />
                     <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{place.icon || '📍'}</span>
                                <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">{place.category?.name || 'Sted'}</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{place.name}</h1>
                            <div className="flex items-center gap-4 text-white/90">
                                <div className="flex items-center gap-1"><MapPin size={16} /><span className="text-sm font-medium">{place.address}</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
                    {(place.is_sponsored && place.offer) && (<div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6"><div className="flex items-start gap-4"><div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-full"><Ticket className="text-green-600 dark:text-green-400" size={24} /></div><div className="flex-1"><h3 className="font-bold text-green-800 dark:text-green-300 text-lg mb-2">🎁 Sponsoreret Tilbud</h3><p className="text-green-700 dark:text-green-200 font-medium text-xl">{place.offer}</p></div></div></div>)}
                    
                    <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border"><h3 className="font-bold text-text-primary dark:text-dark-text-primary text-xl mb-4">Om stedet</h3><p className="text-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap">{place.description || 'Ingen beskrivelse tilgængelig.'}</p></div>

                    {allTags.length > 0 && (
                        <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border">
                            <h3 className="font-bold text-text-primary dark:text-dark-text-primary text-xl mb-4">Aktiviteter & Interesser</h3>
                            <div className="flex flex-wrap gap-2">
                                {allTags.map(tag => (<span key={tag.id} className="bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light px-3 py-1.5 rounded-full text-sm font-medium">{tag.name}</span>))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border space-y-4">
                        <h3 className="font-bold text-text-primary dark:text-dark-text-primary text-xl mb-2">Information</h3>
                        {place.address && <div className="flex items-center gap-3"><div className="p-2 bg-primary-light dark:bg-primary/20 rounded-full"><MapPin className="text-primary" size={20} /></div><p className="text-text-secondary dark:text-dark-text-secondary font-medium">{place.address}</p></div>}
                        {place.phone && <div className="flex items-center gap-3"><div className="p-2 bg-primary-light dark:bg-primary/20 rounded-full"><Phone className="text-primary" size={20} /></div><p className="text-text-secondary dark:text-dark-text-secondary font-medium">{place.phone}</p></div>}
                        {place.opening_hours && <div className="flex items-center gap-3"><div className="p-2 bg-primary-light dark:bg-primary/20 rounded-full"><Clock className="text-primary" size={20} /></div><p className="text-text-secondary dark:text-dark-text-secondary font-medium">{place.opening_hours}</p></div>}
                        {place.organization_id && (
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-light dark:bg-primary/20 rounded-full"><Info className="text-primary" size={20} /></div>
                                    <div><h3 className="font-bold text-text-primary dark:text-dark-text-primary">Arrangør</h3><p className="text-text-secondary dark:text-dark-text-secondary text-sm">I samarbejde med {place.organization?.name}</p></div>
                                </div>
                                <Link to={`/organization/${place.organization_id}`} className="bg-primary text-white px-4 py-2 rounded-full font-semibold hover:bg-primary-dark transition-colors text-sm">Se profil</Link>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            
            <footer className="sticky bottom-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border p-4 z-10">
                <div className="max-w-4xl mx-auto md:flex md:space-x-4 space-y-3 md:space-y-0">
                    <button onClick={() => setShowShareModal(true)} className="w-full md:w-auto md:flex-1 bg-primary-light text-primary dark:bg-dark-surface-light dark:text-dark-text-primary font-bold py-3 px-4 rounded-full text-lg transition duration-300 hover:bg-primary/20 dark:hover:bg-dark-border flex items-center justify-center">
                        <Share2 size={20} className="mr-2"/> Del med SoulMate
                    </button>
                    <button onClick={() => navigate('/checkin', { state: { place } })} className="w-full md:w-auto md:flex-1 bg-primary text-white font-bold py-3 px-4 rounded-full text-lg transition duration-300 shadow-lg hover:bg-primary-dark flex items-center justify-center">
                        <CheckSquare size={20} className="mr-2"/> Check ind
                    </button>
                </div>
            </footer>
             
            {showShareModal && (<ShareModal title="Del sted med en Soulmate" soulmates={soulmates} onShare={handleShare} onClose={() => setShowShareModal(false)} />)}
            {shareConfirmation && (<div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-bold py-2 px-4 rounded-full z-50">{shareConfirmation}</div>)}
        </div>
    );
};

export default PlaceDetailPage;