import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { Event, User, MessageThread } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import ImageSlideshow from '../components/ImageSlideshow';
import { fetchPrivateFile } from '../services/s3Service';
import { ArrowLeft, Share2, Users, MapPin, Calendar, Check, Plus, MessageCircle, HeartHandshake, Loader2 } from 'lucide-react';
import PostEventFriendModal from '../components/PostEventFriendModal';
import { useNotifications } from '../hooks/useNotifications';
import { addEventToCalendar } from '../services/googleCalendarService';
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


const EventDetailPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { addToast } = useNotifications();
    
    const [event, setEvent] = useState<Event | null>(null);
    const [participants, setParticipants] = useState<User[]>([]);
    const [isParticipant, setIsParticipant] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [showFriendModal, setShowFriendModal] = useState(false);
    
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [privateChats, setPrivateChats] = useState<MessageThread[]>([]);
    const [publicUrl, setPublicUrl] = useState<string | undefined>(undefined);

    const fetchEvent = useCallback(async () => {
        if (!eventId || !currentUser) return;
        setLoading(true);

        const eventPromise = supabase
            .from('events')
            .select('*, organization:organizations(*), images:event_images(id, image_url), category:categories(*), interests:event_interests(interest:interests(*)), event_activities:event_activities(activity:activities(*)), message_thread:message_threads(id)')
            .eq('id', eventId)
            .single();
            
        const participantsPromise = supabase
            .from('event_participants')
            .select('user:users(*)')
            .eq('event_id', eventId);

        const [{ data: eventData, error: eventError }, { data: participantsData, error: participantsError }] = await Promise.all([
            eventPromise,
            participantsPromise
        ]);
        
        if (eventError || !eventData) {
            console.error('Error fetching event:', eventError?.message);
            setLoading(false);
            return;
        }
        setEvent(eventData as any);
        if (eventData.organization && eventData.title) {
            const orgSlug = slugify(eventData.organization.name);
            const eventSlug = slugify(eventData.title);
            setPublicUrl(`/event/${orgSlug}/${eventSlug}`);
        }
        
        if (participantsError) {
            console.error('Error fetching participants:', participantsError.message);
        } else if (participantsData) {
            const users = participantsData.map((p: any) => p.user).filter(Boolean);
            setParticipants(users);
            setIsParticipant(users.some((p: User) => p.id === currentUser.id));
        }

        setLoading(false);
    }, [eventId, currentUser]);

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
        fetchEvent();
    }, [fetchEvent]);

    useEffect(() => {
        if (isShareModalOpen) {
            fetchPrivateChats();
        }
    }, [isShareModalOpen, fetchPrivateChats]);

    const handleJoinLeave = async () => {
        if (!eventId || !currentUser || !event) return;
        setIsJoining(true);

        if (isParticipant) {
            await supabase.from('event_participants').delete().match({ event_id: eventId, user_id: currentUser.id });
            if (new Date(event!.time) < new Date()) {
                setShowFriendModal(true);
            }
        } else {
            await supabase.from('event_participants').insert({ event_id: eventId, user_id: currentUser.id });
            
            // Trigger Google Calendar sync if connected. This runs in the background.
            addEventToCalendar(event, addToast);
        }

        await fetchEvent(); // Refetch to update participant list and button state
        setIsJoining(false);
    };

    const handleShare = async (thread: MessageThread) => {
        if (!currentUser || !event) return;

        const otherParticipant = thread.participants[0]?.user;
        if (!otherParticipant) return;
        
        const threadId = thread.id;

        const { error } = await supabase.from('messages').insert({
            thread_id: threadId,
            sender_id: currentUser.id,
            text: `Jeg synes du skal tjekke dette event ud: ${event.title}`,
            card_data: {
                type: 'event',
                id: event.id,
                title: event.title,
                image_url: event.image_url,
                address: event.address,
            }
        });

        if (error) {
            addToast({ type: 'system', message: `Kunne ikke dele event: ${error.message}` });
        } else {
            addToast({ type: 'system', message: `Event delt med ${otherParticipant.name}!` });
            setIsShareModalOpen(false);
        }
    };
    
    const handleChat = async () => {
        if (!event?.message_thread?.id) {
             alert("Der er ingen chat tilgængelig for dette event."); return;
        }
        navigate(`/chat/${event.message_thread.id}`);
    }

    const isCreator = useMemo(() => {
        if (!event || !currentUser) return false;
        return event.creator_user_id === currentUser.id;
    }, [event, currentUser]);

    const eventHasPassed = useMemo(() => event ? new Date(event.time) < new Date() : false, [event]);

    if (loading) return <LoadingScreen message="Indlæser event..." />;
    if (!event) return <div className="p-4 text-center">Event ikke fundet.</div>;

    const allInterests = event.interests?.map((i: any) => i.interest).filter(Boolean) || [];
    const allActivities = event.event_activities?.map((a: any) => a.activity).filter(Boolean) || [];

    return (
        <div className="flex flex-col h-full bg-background dark:bg-dark-background">
            {currentUser && <PostEventFriendModal isOpen={showFriendModal} onClose={() => setShowFriendModal(false)} participants={participants} currentUser={currentUser} />}
            {isShareModalOpen && event && (
                <ShareModal
                    title={`Del "${event.title}"`}
                    soulmates={privateChats}
                    onShare={handleShare}
                    onClose={() => setIsShareModalOpen(false)}
                    publicUrl={publicUrl}
                />
            )}
            
            <header className="fixed top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md md:relative md:bg-transparent md:backdrop-blur-none dark:bg-dark-surface/90 dark:md:bg-transparent border-b border-gray-100 dark:border-dark-border md:border-0">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft size={24} /></button>
                    <h1 className="text-xl font-bold">Event Detaljer</h1>
                    <button onClick={() => setIsShareModalOpen(true)} className="p-2 -mr-2"><Share2 size={20} /></button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                <ImageSlideshow imageUrl={event.image_url} images={event.images} alt={event.title} />

                <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{event.icon}</span>
                        <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">{event.category?.name || 'Event'}</span>
                        {event.is_diagnosis_friendly && (<span className="flex items-center bg-blue-100 text-blue-800 font-semibold px-2 py-1 rounded-full text-xs"><HeartHandshake size={14} className="mr-1.5"/>Diagnosevenligt</span>)}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold">{event.title}</h1>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start p-4 bg-white dark:bg-dark-surface rounded-lg"><Calendar className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" /><div><p className="font-bold">Dato & Tid</p><p className="text-sm">{new Date(event.time).toLocaleString('da-DK', { dateStyle: 'full', timeStyle: 'short' })}</p></div></div>
                        <div className="flex items-start p-4 bg-white dark:bg-dark-surface rounded-lg"><MapPin className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" /><div><p className="font-bold">Lokation</p><p className="text-sm">{event.address}</p></div></div>
                    </div>
                    
                    <div className="p-4 bg-white dark:bg-dark-surface rounded-lg">
                        <h2 className="font-bold text-xl mb-3">Beskrivelse</h2>
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap leading-relaxed">{event.description}</div>
                    </div>
                    
                     {(allInterests.length > 0 || allActivities.length > 0) && (
                        <div className="p-4 bg-white dark:bg-dark-surface rounded-lg">
                             {allActivities.length > 0 && (<div className="mb-4"><h3 className="font-semibold mb-2">Aktiviteter</h3><div className="flex flex-wrap gap-2">{allActivities.map(act => <span key={act.id} className="tag-activity">{act.name}</span>)}</div></div>)}
                            {allInterests.length > 0 && (<div><h3 className="font-semibold mb-2">Interesser</h3><div className="flex flex-wrap gap-2">{allInterests.map(int => <span key={int.id} className="tag-interest">{int.name}</span>)}</div></div>)}
                        </div>
                    )}

                    <div className="p-4 bg-white dark:bg-dark-surface rounded-lg">
                        <h2 className="font-bold text-xl mb-3 flex items-center"><Users className="mr-2"/>Deltagere ({participants.length})</h2>
                        <div className="flex -space-x-4">
                            {participants.slice(0, 10).map(p => (
                                <Link to={`/user/${p.id}`} key={p.id}>
                                    <PrivateImage src={p.avatar_url} alt={p.name} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-dark-surface" />
                                </Link>
                            ))}
                            {participants.length > 10 && <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm">+{participants.length - 10}</div>}
                        </div>
                    </div>
                </div>
            </main>
            
            <footer className="sticky bottom-0 bg-white dark:bg-dark-surface border-t p-4 z-10">
                <div className="max-w-4xl mx-auto flex gap-4">
                    {event.message_thread?.id && <button onClick={handleChat} className="flex-1 bg-primary-light text-primary font-bold py-3 rounded-full flex items-center justify-center"><MessageCircle size={20} className="mr-2"/> Gå til chat</button>}
                    <button 
                        onClick={handleJoinLeave} 
                        disabled={isJoining || isCreator} 
                        className="flex-1 bg-primary text-white font-bold py-3 rounded-full flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isJoining ? <Loader2 className="animate-spin" /> : 
                         isCreator ? <><Check className="mr-2"/>Du er Vært</> : 
                         isParticipant ? (eventHasPassed ? <><Users className="mr-2"/>Forlad & Find Venner</> : <><Check className="mr-2"/>Deltager</>) : 
                         <><Plus className="mr-2"/>Deltag</>
                        }
                    </button>
                </div>
            </footer>
             <style>{`.tag-activity { background-color: #DBEAFE; color: #1E40AF; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; } .dark .tag-activity { background-color: #1E3A8A; color: #BFDBFE; } .tag-interest { background-color: #E0E7FF; color: #4338CA; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; } .dark .tag-interest { background-color: #3730A3; color: #C7D2FE; }`}</style>
        </div>
    );
};

export default EventDetailPage;