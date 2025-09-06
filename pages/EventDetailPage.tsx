import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Info, Ticket } from 'lucide-react';
import type { Event, User, MessageThread } from '../types';
import ShareModal from '../components/ShareModal';
import ImageSlideshow from '../components/ImageSlideshow';
import { supabase } from '../services/supabase';
import { fetchPrivateFile } from '../services/s3Service';
import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');

    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            fetchPrivateFile(src).then(url => {
                objectUrl = url;
                setImageUrl(url);
            });
        }
        return () => {
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    if (!imageUrl) return <div className={`${className} bg-gray-200 animate-pulse`} />;
    return <img src={imageUrl} alt={alt} className={className} />;
};


const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const formatText = (inputText: string) => {
        // Replace **text** with <strong>text</strong>
        let formatted = inputText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Replace *text* with <em>text</em>
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Handle list items starting with - or *
        formatted = formatted.replace(/^\s*[-*]\s+(.*)/gm, '<li class="ml-4 list-disc">$1</li>');
        // Wrap consecutive list items in a <ul>
        formatted = formatted.replace(/(<li.*?>.*?<\/li>)+/gs, '<ul>$&</ul>');
        // Replace newlines with <br> for paragraph breaks, but not inside lists
        formatted = formatted.replace(/<\/ul>\n/g, '</ul><br/>').replace(/\n/g, '<br />');
        return formatted;
    };

    return <div dangerouslySetInnerHTML={{ __html: formatText(text) }} className="break-words whitespace-pre-wrap leading-relaxed" />;
};

const EventDetailPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const { user: currentUser, loading: authLoading } = useAuth();
    const [soulmates, setSoulmates] = useState<MessageThread[]>([]);
    const [isJoined, setIsJoined] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareConfirmation, setShareConfirmation] = useState('');
    const [loading, setLoading] = useState(true);

    const formattedTimeRange = useMemo(() => {
        if (!event?.time) return 'Tidspunkt ukendt';
        
        const startTime = new Date(event.time);
        
        const weekday = startTime.toLocaleString('da-DK', { weekday: 'long' });
        const day = startTime.getDate();
        const month = startTime.toLocaleString('da-DK', { month: 'short' }).replace('.', '');
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        const datePart = `${capitalizedWeekday} d. ${day} ${month}`;

        const startTimeString = startTime.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');

        let timePart = startTimeString;

        if (event.end_time) {
            const endTime = new Date(event.end_time);
            const endTimeString = endTime.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');
            timePart += ` - ${endTimeString}`;
        }
        
        return `${datePart}, ${timePart}`;
    }, [event]);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!eventId) return;
            if (!currentUser) {
                if (!authLoading) navigate('/login');
                return;
            }
            setLoading(true);

            const { data, error } = await supabase
                .from('events')
                .select('*, participants:event_participants(user:users(*)), images:event_images(id, image_url), category:categories(*)')
                .eq('id', eventId)
                .single();
            
            if (error) {
                console.error('Error fetching event details:', error);
                setEvent(null);
            } else {
                const transformedEvent = { ...data, participants: data.participants.map((p: any) => p.user).filter(Boolean) };
                setEvent(transformedEvent as Event);
                setIsJoined(transformedEvent.participants.some((p: User) => p.id === currentUser.id));
            }
            
            const fetchSoulmates = async (currentUserId: number): Promise<MessageThread[]> => {
                const { data: threadParticipants, error: tpError } = await supabase.from('message_thread_participants').select('thread_id').eq('user_id', currentUserId);
                if (tpError || !threadParticipants || threadParticipants.length === 0) return [];
                const threadIds = threadParticipants.map(tp => tp.thread_id);

                const { data: threadsData, error: threadsError } = await supabase.from('message_threads').select('id, participants:message_thread_participants(user:users(*))').in('id', threadIds);
                if (threadsError) { console.error("Error fetching soulmate threads:", threadsError); return []; }

                const soulmateThreads: MessageThread[] = threadsData.map(thread => {
                    const otherParticipant = thread.participants.find(p => {
                        if (!p.user) return false;
                        const user = Array.isArray(p.user) ? p.user[0] : p.user;
                        return user && user.id !== currentUserId;
                    });
                    if (!otherParticipant) return null;
                    const user = Array.isArray(otherParticipant.user) ? otherParticipant.user[0] : otherParticipant.user;
                    if (!user) return null;

                    return {
                        id: thread.id, participants: [{ user: user }], last_message: '', timestamp: '', unread_count: 0
                    };
                }).filter((t): t is MessageThread => t !== null);
                
                const uniqueThreads = Array.from(new Map(soulmateThreads.map(t => [t.participants[0].user.id, t])).values());
                return uniqueThreads;
            };
            
            const soulmatesData = await fetchSoulmates(currentUser.id);
            setSoulmates(soulmatesData);

            setLoading(false);
        };
        fetchInitialData();
    }, [eventId, navigate, currentUser, authLoading]);
    
    const handleToggleJoin = async () => {
        if (!event || !currentUser) return;
        const optimisticParticipants = event.participants || [];

        if (isJoined) {
            setEvent({ ...event, participants: optimisticParticipants.filter(p => p.id !== currentUser.id) });
            setIsJoined(false);
            const { error } = await supabase.from('event_participants').delete().match({ event_id: event.id, user_id: currentUser.id });
            if (error) { // Revert on error
                console.error("Error leaving event:", error);
                setEvent({ ...event, participants: optimisticParticipants });
                setIsJoined(true);
            }
        } else {
            setEvent({ ...event, participants: [...optimisticParticipants, currentUser] });
            setIsJoined(true);
            const { error } = await supabase.from('event_participants').insert({ event_id: event.id, user_id: currentUser.id });
            if (error) { // Revert on error
                console.error("Error joining event:", error);
                setEvent({ ...event, participants: optimisticParticipants });
                setIsJoined(false);
            }
        }
    };

    const handleShare = async (thread: MessageThread) => {
        setShowShareModal(false);
        if (!event || !currentUser) return;

        const user = thread.participants[0].user;
        const threadId = thread.id;
        const messageText = `Jeg har set eventet "${event.title}". Skal vi tage afsted sammen? 😊`;
        
        const card_data = {
            type: 'event' as const,
            id: event.id,
            title: event.title,
            image_url: event.image_url || event.images?.[0]?.image_url,
            address: event.address,
            offer: event.is_sponsored ? event.offer : undefined,
        };

        const { error } = await supabase.from('messages').insert({
            thread_id: threadId,
            sender_id: currentUser.id,
            text: messageText,
            card_data: card_data
        });
        
        if (error) {
            setShareConfirmation(`Fejl: Kunne ikke dele med ${user.name}.`);
        } else {
            setShareConfirmation(`Event delt med ${user.name}!`);
        }
        setTimeout(() => setShareConfirmation(''), 3000);
    };
    
    if (authLoading || loading) {
        return <LoadingScreen message="Loading event..." />;
    }

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
        <div className="flex flex-col h-full bg-background dark:bg-dark-background">
            <header className="fixed top-0 left-0 right-0 z-20 bg-white bg-opacity-80 backdrop-blur-sm md:relative md:bg-transparent md:backdrop-blur-none dark:bg-dark-surface/80 dark:md:bg-transparent">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary dark:text-dark-text-primary">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">SoulMatch</h1>
                    <div className="w-8"></div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                <div className="md:max-w-4xl mx-auto p-4 md:p-6">
                    <ImageSlideshow images={event.images} alt={event.title} />
                </div>

                <div className={`md:max-w-4xl mx-auto p-4 md:p-6 pt-4 md:pt-6`}>
                    <div className="relative p-6 rounded-3xl shadow-xl bg-gray-50 dark:bg-dark-surface mb-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{event.title}</h2>
                                <p className="text-text-secondary dark:text-dark-text-secondary mt-1 font-semibold">{formattedTimeRange}</p>
                                <p className="text-text-secondary dark:text-dark-text-secondary mt-1">Host: {event.host_name}</p>
                                <p className="font-semibold text-primary mt-2">{event.category?.name || 'Ukendt'}</p>
                            </div>
                            {event.organization_id && (
                                <Link to={`/organization/${event.organization_id}`} className="p-3 bg-white dark:bg-dark-surface-light rounded-full border border-gray-200 dark:border-dark-border text-primary hover:bg-primary-light dark:hover:bg-primary/20">
                                    <Info size={24} />
                                </Link>
                            )}
                        </div>
                    </div>

                    {event.is_sponsored && event.offer && (
                        <section className="mb-8">
                            <div className="bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 text-green-800 dark:text-green-300 p-4 rounded-r-lg flex items-center">
                                <Ticket className="h-8 w-8 mr-4" />
                                <div>
                                    <h3 className="font-bold">Sponsoreret Tilbud</h3>
                                    <p>{event.offer}</p>
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="mb-8">
                        <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Deltagere ({event.participants?.length || 0})</h3>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                            {participantsToShow.map(user => (
                                <div key={user.id} className="text-center">
                                    <PrivateImage src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full mx-auto object-cover" />
                                    <p className="text-sm mt-2 truncate font-semibold text-text-secondary dark:text-dark-text-secondary">{user.name}</p>
                                </div>
                            ))}
                            {remainingParticipants > 0 && (
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-dark-surface-light flex items-center justify-center">
                                        <span className="font-bold text-text-secondary dark:text-dark-text-secondary">+{remainingParticipants}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Beskrivelse</h3>
                        <div className="bg-gray-100 dark:bg-dark-surface-light p-4 rounded-xl text-text-secondary dark:text-dark-text-primary">
                            <MarkdownRenderer text={event.description || ''} />
                        </div>
                    </section>
                </div>
            </main>
            
            <footer className="sticky bottom-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border p-4 z-10">
                <div className="max-w-4xl mx-auto md:flex md:space-x-4 space-y-3 md:space-y-0">
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="w-full md:w-auto md:flex-1 bg-primary-light text-primary dark:bg-dark-surface-light dark:text-dark-text-primary font-bold py-3 px-4 rounded-full text-lg transition duration-300 hover:bg-primary/20 dark:hover:bg-dark-border"
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
                    soulmates={soulmates}
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