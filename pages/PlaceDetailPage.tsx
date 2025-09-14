import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { Place, Activity, Interest, MessageThread, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import ImageSlideshow from '../components/ImageSlideshow';
import { fetchPrivateFile } from '../services/s3Service';
import { ArrowLeft, Share2, MapPin, Clock, MessageSquare, CheckCircle, Loader2, Award } from 'lucide-react';
import SoulmatchCertification from '../components/SoulmatchCertification';
import { useNotifications } from '../hooks/useNotifications';
import ShareModal from '../components/ShareModal';

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            fetchPrivateFile(src).then(url => { objectUrl = url; setImageUrl(url); });
        }
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [src]);
    if (!imageUrl) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light animate-pulse`} />;
    return <img src={imageUrl} alt={alt} className={className} />;
};

const slugify = (text: string): string => {
  if (!text) return '';
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

const PlaceDetailPage: React.FC = () => {
    const { placeId } = useParams<{ placeId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { addToast } = useNotifications();
    
    const [place, setPlace] = useState<Place | null>(null);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [showCertification, setShowCertification] = useState(false);

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [privateChats, setPrivateChats] = useState<MessageThread[]>([]);
    const [publicUrl, setPublicUrl] = useState<string | undefined>(undefined);


    const fetchPlace = useCallback(async () => {
        if (!placeId || !currentUser) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('places')
            .select('*, organization:organizations(*), images:place_images(id, image_url), category:categories(*), place_activities:place_activities(activity:activities(*)), place_interests:place_interests(interest:interests(*))')
            .eq('id', placeId)
            .single();
        
        if (error || !data) {
            console.error('Error fetching place:', error);
            setLoading(false);
            return;
        }
        setPlace(data as any);
        if (data.organization && data.name) {
            const orgSlug = slugify(data.organization.name);
            const placeSlug = slugify(data.name);
            setPublicUrl(`/place/${orgSlug}/${placeSlug}`);
        }
        setLoading(false);
    }, [placeId, currentUser]);

    const fetchPrivateChats = useCallback(async () => {
        if (!currentUser) return;
        
        const { data: myThreads, error: myThreadsError } = await supabase
            .from('message_thread_participants')
            .select('thread_id')
            .eq('user_id', currentUser.id);

        if (myThreadsError) {
            console.error("Error fetching user's threads:", myThreadsError);
            return;
        }
        const myThreadIds = myThreads.map(t => t.thread_id);
        
        if (myThreadIds.length === 0) return;

        const { data: privateThreads, error: privateThreadsError } = await supabase
            .from('message_threads')
            .select('*, participants:message_thread_participants(user:users(*))')
            .in('id', myThreadIds)
            .eq('is_event_chat', false)
            .order('timestamp', { ascending: false });

        if (privateThreadsError) {
            console.error("Error fetching private chats:", privateThreadsError);
            return;
        }
        
        const filtered = (privateThreads as any[])
            .filter(t => t.participants.length === 2)
            .map(t => ({
                ...t,
                id: String(t.id),
                participants: t.participants.filter((p: any) => p.user && p.user.id !== currentUser.id),
            }));

        setPrivateChats(filtered);
    }, [currentUser]);

    useEffect(() => {
        fetchPlace();
    }, [fetchPlace]);
    
    useEffect(() => {
        if (isShareModalOpen) {
            fetchPrivateChats();
        }
    }, [isShareModalOpen, fetchPrivateChats]);

    const handleSendMessage = async () => {
        if (!place?.organization?.host_name) {
             alert("Organisationen har ikke angivet en kontaktperson."); return;
        }

        setIsJoining(true);

        const { data: hostUser, error: findUserError } = await supabase
            .from('users')
            .select('id')
            .eq('name', place.organization.host_name)
            .eq('bio', `Kontaktperson for ${place.organization.name}`)
            .limit(1)
            .single();
        
        if(findUserError || !hostUser) {
             alert("Kunne ikke finde en brugerprofil for organisationens kontaktperson.");
             setIsJoining(false);
             return;
        }

        const { data: threadId, error } = await supabase.rpc('get_or_create_chat_thread', { p_friend_id: hostUser.id });
        if (error || !threadId) {
            alert('Kunne ikke starte chat.');
            console.error(error);
        } else {
            navigate(`/chat/${threadId}`);
        }
        setIsJoining(false);
    };

    const handleCheckin = () => {
        navigate('/checkin', { state: { place } });
    };

    const handleShare = async (thread: MessageThread) => {
        if (!currentUser || !place) return;

        const otherParticipant = thread.participants[0]?.user;
        if (!otherParticipant) return;
        
        const threadId = thread.id;

        const { error } = await supabase.from('messages').insert({
            thread_id: threadId,
            sender_id: currentUser.id,
            text: `Jeg synes du skal tjekke dette sted ud: ${place.name}`,
            card_data: {
                type: 'place',
                id: place.id,
                title: place.name,
                image_url: place.image_url,
                address: place.address,
                offer: place.offer,
            }
        });
        
        if (error) {
            addToast({ type: 'system', message: `Kunne ikke dele mødested: ${error.message}` });
        } else {
            addToast({ type: 'system', message: `Mødested delt med ${otherParticipant.name}!` });
            setIsShareModalOpen(false);
        }
    };

    if (loading) return <LoadingScreen message="Indlæser mødested..." />;
    if (!place) return <div className="p-4 text-center">Mødested ikke fundet.</div>;

    const allActivities: Activity[] = place.place_activities?.map((a: any) => a.activity).filter(Boolean) || [];
    const allInterests: Interest[] = place.place_interests?.map((i: any) => i.interest).filter(Boolean) || [];

    return (
        <div className="flex flex-col h-full bg-background dark:bg-dark-background">
            {showCertification && <SoulmatchCertification onClose={() => setShowCertification(false)} />}
            {isShareModalOpen && place && (
                <ShareModal
                    title={`Del "${place.name}"`}
                    soulmates={privateChats}
                    onShare={handleShare}
                    onClose={() => setIsShareModalOpen(false)}
                    publicUrl={publicUrl}
                />
            )}
            
            <header className="fixed top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md md:relative md:bg-transparent md:backdrop-blur-none dark:bg-dark-surface/90 dark:md:bg-transparent border-b border-gray-100 dark:border-dark-border md:border-0">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft size={24} /></button>
                    <h1 className="text-xl font-bold">Mødested</h1>
                    <button onClick={() => setIsShareModalOpen(true)} className="p-2 -mr-2"><Share2 size={20} /></button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                <ImageSlideshow imageUrl={place.image_url} images={place.images} alt={place.name} />

                <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <span className="text-3xl">{place.icon}</span>
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-4xl font-bold">{place.name}</h1>
                            <p className="text-lg font-semibold text-primary">{place.offer}</p>
                        </div>
                        {place.is_certified && (
                            <button onClick={() => setShowCertification(true)} className="flex items-center bg-yellow-100 text-yellow-800 font-semibold px-3 py-2 rounded-full text-sm hover:bg-yellow-200 transition-colors">
                                <Award size={16} className="mr-1.5"/> SoulMatch Certificeret
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start p-4 bg-white dark:bg-dark-surface rounded-lg"><Clock className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" /><div><p className="font-bold">Åbningstider</p><p className="text-sm">{place.opening_hours}</p></div></div>
                        <div className="flex items-start p-4 bg-white dark:bg-dark-surface rounded-lg"><MapPin className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" /><div><p className="font-bold">Lokation</p><p className="text-sm">{place.address}</p></div></div>
                    </div>
                    
                    <div className="p-4 bg-white dark:bg-dark-surface rounded-lg">
                        <h2 className="font-bold text-xl mb-3">Beskrivelse</h2>
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap leading-relaxed">{place.description}</div>
                    </div>

                    {(allActivities.length > 0 || allInterests.length > 0) && (
                        <div className="p-4 bg-white dark:bg-dark-surface rounded-lg">
                             {allActivities.length > 0 && (<div className="mb-4"><h3 className="font-semibold mb-2">Aktiviteter</h3><div className="flex flex-wrap gap-2">{allActivities.map(act => <span key={act.id} className="tag-activity">{act.name}</span>)}</div></div>)}
                            {allInterests.length > 0 && (<div><h3 className="font-semibold mb-2">Interesser</h3><div className="flex flex-wrap gap-2">{allInterests.map(int => <span key={int.id} className="tag-interest">{int.name}</span>)}</div></div>)}
                        </div>
                    )}
                    
                    {place.organization && (
                         <div className="p-4 bg-white dark:bg-dark-surface rounded-lg">
                             <h2 className="font-bold text-xl mb-3">Vært</h2>
                             <Link to={`/organization/${place.organization_id}`} className="flex items-center space-x-3 group">
                                <PrivateImage src={place.organization.logo_url} alt={place.organization.name} className="w-12 h-12 rounded-full object-contain bg-gray-100" />
                                <div>
                                    <p className="font-bold group-hover:underline">{place.organization.name}</p>
                                    <p className="text-sm text-text-secondary">{place.organization.address}</p>
                                </div>
                             </Link>
                        </div>
                    )}

                </div>
            </main>
            
            <footer className="sticky bottom-0 bg-white dark:bg-dark-surface border-t p-4 z-10">
                <div className="max-w-4xl mx-auto flex gap-4">
                    <button onClick={handleSendMessage} disabled={isJoining} className="flex-1 bg-primary-light text-primary font-bold py-3 rounded-full flex items-center justify-center disabled:opacity-50">
                        {isJoining ? <Loader2 className="animate-spin" /> : <><MessageSquare size={20} className="mr-2"/> Send Besked</>}
                    </button>
                    <button onClick={handleCheckin} className="flex-1 bg-primary text-white font-bold py-3 rounded-full flex items-center justify-center">
                        <CheckCircle size={20} className="mr-2"/> Check-in
                    </button>
                </div>
            </footer>
             <style>{`.tag-activity { background-color: #DBEAFE; color: #1E40AF; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; } .dark .tag-activity { background-color: #1E3A8A; color: #BFDBFE; } .tag-interest { background-color: #E0E7FF; color: #4338CA; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; } .dark .tag-interest { background-color: #3730A3; color: #C7D2FE; }`}</style>
        </div>
    );
};
export default PlaceDetailPage;