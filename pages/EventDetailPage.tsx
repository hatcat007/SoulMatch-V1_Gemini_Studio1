

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Info, Ticket, MapPin, Users, Calendar, Heart, Share2, User as UserIcon, MessageSquare, Smile, Loader2 } from 'lucide-react';
import type { Event, User, MessageThread, Activity, Interest } from '../types';
import ShareModal from '../components/ShareModal';
import ImageSlideshow from '../components/ImageSlideshow';
import { supabase } from '../services/supabase';
import { fetchPrivateFile } from '../services/s3Service';
import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';
import PostEventFriendModal from '../components/PostEventFriendModal';

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
        let formatted = inputText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/^\s*[-*]\s+(.*)/gm, '<li class="ml-4 list-disc">$1</li>');
        formatted = formatted.replace(/(<li.*?>.*?<\/li>)+/gs, '<ul>$&</ul>');
        formatted = formatted.replace(/<\/ul>\n/g, '</ul><br/>').replace(/\n/g, '<br />');
        return formatted;
    };

    return <div dangerouslySetInnerHTML={{ __html: formatText(text) }} className="break-words whitespace-pre-wrap leading-relaxed" />;
};

const EventCountdownTimer: React.FC<{ startTime: string }> = ({ startTime }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(startTime).getTime() - new Date().getTime();
            let timeLeftObject = { days: 0, hours: 0, minutes: 0, seconds: 0, total: difference };

            if (difference > 0) {
                timeLeftObject = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                    total: difference,
                };
            }
            return timeLeftObject;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        
        setTimeLeft(calculateTimeLeft());

        return () => clearInterval(timer);
    }, [startTime]);

    if (timeLeft.total <= 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border mb-4">
            <h3 className="text-center font-bold text-text-primary dark:text-dark-text-primary mb-4">Eventet starter om</h3>
            <div className="flex justify-center space-x-4 sm:space-x-6">
                <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{String(timeLeft.days).padStart(2, '0')}</p>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary uppercase">Dage</p>
                </div>
                <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{String(timeLeft.hours).padStart(2, '0')}</p>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary uppercase">Timer</p>
                </div>
                <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{String(timeLeft.minutes).padStart(2, '0')}</p>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary uppercase">Minutter</p>
                </div>
                <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{String(timeLeft.seconds).padStart(2, '0')}</p>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary uppercase">Sekunder</p>
                </div>
            </div>
        </div>
    );
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
    const [showPostEventModal, setShowPostEventModal] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    const formattedTimeRange = useMemo(() => {
        if (!event?.time) return 'Tidspunkt ukendt';
        const startDate = new Date(event.time);
        const startOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
        const startTimeString = startDate.toLocaleString('da-DK', startOptions);

        if (!event.end_time) return startTimeString;
        const endDate = new Date(event.end_time);

        if (startDate.toDateString() === endDate.toDateString()) {
            const endTimeString = endDate.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false });
            return `${startTimeString} - ${endTimeString}`;
        } else {
            const endOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
            const endTimeString = endDate.toLocaleString('da-DK', endOptions);
            return `${startTimeString} til ${endTimeString}`;
        }
    }, [event]);

    const allActivities = useMemo(() => {
        if (!event) return [];
        // Only show activities specifically linked to this event via the event_activities table.
        // This prevents showing generic activities from the parent organization.
        const eventActivities = event.event_activities?.map(a => a.activity) || [];
        const activityMap = new Map<number, Activity>();
        eventActivities.forEach(activity => { if (activity) activityMap.set(activity.id, activity); });
        return Array.from(activityMap.values());
    }, [event]);

    const eventInterests = useMemo(() => {
        if (!event) return [];
        return event.interests?.map(i => i.interest).filter((i): i is Interest => i !== null && i !== undefined) || [];
    }, [event]);

    const fetchInitialData = useCallback(async () => {
        if (!eventId) return;
        if (!currentUser) {
            if (!authLoading) navigate('/login');
            return;
        }
        setLoading(true);

        const { data, error } = await supabase
            .from('events')
            .select('*, organization:organizations(logo_url, activities:organization_activities(activity:activities(id, name, icon))), event_activities:event_activities(activity:activities(id, name, icon)), participants:event_participants(user:users(*)), images:event_images(id, image_url), category:categories(*), interests:event_interests(interest:interests(*)), message_thread:message_threads!event_id(id)')
            .eq('id', eventId)
            .single();
        
        if (error) {
            console.error('Error fetching event details:', error.message);
            setEvent(null);
        } else {
             let normalizedMessageThread = null;
            if (data.message_thread) {
                if (Array.isArray(data.message_thread) && data.message_thread.length > 0) {
                    normalizedMessageThread = data.message_thread[0];
                } else if (typeof data.message_thread === 'object' && !Array.isArray(data.message_thread)) {
                    normalizedMessageThread = data.message_thread;
                }
            }

            const transformedEvent = { 
                ...data, 
                message_thread: normalizedMessageThread,
                participants: data.participants.map((p: any) => {
                    const user = Array.isArray(p.user) ? p.user[0] : p.user;
                    return user;
                }).filter(Boolean) 
            };
            setEvent(transformedEvent as Event);
            setIsJoined(transformedEvent.participants.some((p: User) => p.id === currentUser.id));
        }
        
        const { data: threadParticipants } = await supabase.from('message_thread_participants').select('thread_id').eq('user_id', currentUser.id);
        if (threadParticipants && threadParticipants.length > 0) {
            const threadIds = threadParticipants.map(tp => tp.thread_id);
            const { data: threadsData } = await supabase.from('message_threads').select('id, participants:message_thread_participants(user:users(*))').in('id', threadIds);
            
            if (threadsData) {
                const soulmateThreads: MessageThread[] = threadsData.map(thread => {
                    const otherParticipant = thread.participants.find(p => {
                        if (!p.user) return false;
                        const user = Array.isArray(p.user) ? p.user[0] : p.user;
                        return user && user.id !== currentUser.id;
                    });
                    
                    if (!otherParticipant) return null;

                    const user = Array.isArray(otherParticipant.user) ? otherParticipant.user[0] : otherParticipant.user;
                    if (!user) return null;
                    
                    return { id: thread.id, participants: [{ user: user }], last_message: '', timestamp: '', unread_count: 0 };
                }).filter((t): t is MessageThread => t !== null);
                
                const uniqueThreads = Array.from(new Map(soulmateThreads.map(t => [t.participants[0].user.id, t])).values());
                setSoulmates(uniqueThreads);
            }
        }

        setLoading(false);
    }, [eventId, navigate, currentUser, authLoading]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);
    
    const handleToggleJoin = async () => {
        if (!event || !currentUser || isJoining) return;
        setIsJoining(true);
        try {
            if (isJoined) {
                const { error } = await supabase.from('event_participants').delete().match({ event_id: event.id, user_id: currentUser.id });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('event_participants').insert({ event_id: event.id, user_id: currentUser.id });
                if (error) throw error;
            }
            await fetchInitialData();
        } catch (err: any) {
            console.error("Error toggling event participation:", err);
        } finally {
            setIsJoining(false);
        }
    };

    const handleShare = async (thread: MessageThread) => {
        setShowShareModal(false);
        if (!event || !currentUser) return;
        const user = thread.participants[0].user;
        const threadId = thread.id;
        const messageText = `Jeg har set eventet "${event.title}". Skal vi tage afsted sammen? 😊`;
        
        const card_data = {
            type: 'event' as const, id: event.id, title: event.title, image_url: event.image_url || event.images?.[0]?.image_url,
            address: event.address, offer: event.is_sponsored ? event.offer : undefined,
        };

        const { error } = await supabase.from('messages').insert({ thread_id: threadId, sender_id: currentUser.id, text: messageText, card_data: card_data });
        
        if (error) setShareConfirmation(`Fejl: Kunne ikke dele med ${user.name}.`);
        else setShareConfirmation(`Event delt med ${user.name}!`);
        setTimeout(() => setShareConfirmation(''), 3000);
    };

    const EventChatButton: React.FC = () => {
        const [now, setNow] = useState(Date.now());
        const activationTime = useMemo(() => event ? new Date(event.time).getTime() - 48 * 60 * 60 * 1000 : 0, [event]);
        const endTime = useMemo(() => event ? new Date(event.end_time || event.time).getTime() : 0, [event]);

        useEffect(() => {
            const timer = setInterval(() => setNow(Date.now()), 1000);
            return () => clearInterval(timer);
        }, []);

        if (!event) return null;

        if (now < activationTime) {
            const diff = activationTime - now;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            const countdownText = days > 0
                ? `Gruppechat åbner om ${days}d ${hours}t ${minutes}m ${seconds}s`
                : `Gruppechat åbner om ${hours}t ${minutes}m ${seconds}s`;

            return (
                <button disabled className="w-full bg-gray-300 text-gray-500 font-bold py-3 px-4 rounded-full text-lg flex items-center justify-center">
                    <MessageSquare size={20} className="mr-2"/>{countdownText}
                </button>
            );
        }
        
        if (now > endTime) {
            return (
                <button onClick={() => setShowPostEventModal(true)} className="w-full bg-accent text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-accent-light flex items-center justify-center">
                    <Heart size={20} className="mr-2"/>Tag Næste Skridt
                </button>
            );
        }
        
        if (event.message_thread && event.message_thread.id) {
            return (
                <Link to={`/chat/${event.message_thread.id}`} className="w-full text-center bg-primary-light text-primary dark:bg-dark-surface-light dark:text-dark-text-primary font-bold py-3 px-4 rounded-full text-lg hover:bg-primary/20 dark:hover:bg-dark-border flex items-center justify-center">
                    <MessageSquare size={20} className="mr-2"/>Event Gruppechat
                </Link>
            );
        }
        return <button disabled className="w-full bg-gray-300 text-gray-500 font-bold py-3 px-4 rounded-full text-lg flex items-center justify-center">Gruppechat</button>;
    };
    
    if (authLoading || loading) return <LoadingScreen message="Indlæser event..." />;
    if (!event) return <div className="p-4 text-center"><p>Event not found.</p><button onClick={() => navigate('/home')} className="text-primary mt-4">Tilbage til hjem</button></div>;

    const participantsToShow = event.participants?.slice(0, 15) || [];
    const remainingParticipants = event.participants ? event.participants.length - participantsToShow.length : 0;

    return (
        <div className="flex flex-col h-full bg-background dark:bg-dark-background">
            {showPostEventModal && currentUser && event.participants && (
                <PostEventFriendModal isOpen={showPostEventModal} onClose={() => setShowPostEventModal(false)} participants={event.participants} currentUser={currentUser} />
            )}
            <header className="fixed top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md md:relative md:bg-transparent md:backdrop-blur-none dark:bg-dark-surface/90 dark:md:bg-transparent border-b border-gray-100 dark:border-dark-border md:border-0">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary dark:text-dark-text-primary hover:bg-primary-light dark:hover:bg-dark-surface-light rounded-full transition-colors"><ArrowLeft size={24} /></button>
                    <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Event Detaljer</h1>
                    <div className="w-8"></div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                <div className="relative">
                    <ImageSlideshow imageUrl={event.image_url} images={event.images} alt={event.title} />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{event.icon || '🎉'}</span>
                                <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">{event.category?.name || 'Event'}</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{event.title}</h1>
                            <div className="flex items-center gap-4 text-white/90">
                                <div className="flex items-center gap-1"><Users size={16} /><span className="text-sm font-medium">{event.participants?.length || 0} deltagere</span></div>
                                <div className="flex items-center gap-1"><UserIcon size={16} /><span className="text-sm font-medium">Host: {event.host_name}</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
                    <EventCountdownTimer startTime={event.time} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border"><div className="flex items-center gap-3 mb-3"><div className="p-2 bg-primary-light dark:bg-primary/20 rounded-full"><Calendar className="text-primary" size={20} /></div><h3 className="font-bold text-text-primary dark:text-dark-text-primary">Tidspunkt</h3></div><p className="text-text-secondary dark:text-dark-text-secondary font-medium">{formattedTimeRange}</p></div>
                        {event.address && (<div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border"><div className="flex items-center gap-3 mb-3"><div className="p-2 bg-primary-light dark:bg-primary/20 rounded-full"><MapPin className="text-primary" size={20} /></div><h3 className="font-bold text-text-primary dark:text-dark-text-primary">Lokation</h3></div><p className="text-text-secondary dark:text-dark-text-secondary font-medium">{event.address}</p></div>)}
                    </div>
                    {event.is_sponsored && event.offer && (<div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6"><div className="flex items-start gap-4"><div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-full"><Ticket className="text-green-600 dark:text-green-400" size={24} /></div><div className="flex-1"><h3 className="font-bold text-green-800 dark:text-green-300 text-lg mb-2">🎁 Sponsoreret Tilbud</h3><p className="text-green-700 dark:text-green-200 font-medium">{event.offer}</p></div></div></div>)}
                    {event.is_diagnosis_friendly && (<div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6"><div className="flex items-start gap-4"><div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full"><Smile className="text-blue-600 dark:text-blue-400" size={24} /></div><div className="flex-1"><h3 className="font-bold text-blue-800 dark:text-blue-300 text-lg mb-1">Diagnosevenligt Event</h3><p className="text-blue-700 dark:text-blue-200 font-medium text-sm">Dette event er designet til at være hensynsfuldt over for deltagere med diagnoser.</p></div></div></div>)}
                    {event.organization_id && (<div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-primary-light dark:bg-primary/20 rounded-full"><Info className="text-primary" size={20} /></div><div><h3 className="font-bold text-text-primary dark:text-dark-text-primary">Arrangør</h3><p className="text-text-secondary dark:text-dark-text-secondary text-sm">Se mere om organisationen</p></div></div><Link to={`/organization/${event.organization_id}`} className="bg-primary text-white px-4 py-2 rounded-full font-semibold hover:bg-primary-dark transition-colors">Se profil</Link></div></div>)}
                    {(allActivities.length > 0 || eventInterests.length > 0) && (<div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border">{allActivities.length > 0 && (<div className={eventInterests.length > 0 ? 'mb-6' : ''}><h3 className="font-bold text-text-primary dark:text-dark-text-primary text-xl mb-4">Aktiviteter</h3><div className="flex flex-wrap gap-2">{allActivities.map(activity => (<span key={`act-${activity.id}`} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-3 py-1.5 rounded-full text-sm font-medium">{activity.name}</span>))}</div></div>)}{eventInterests.length > 0 && (<div><h3 className="font-bold text-text-primary dark:text-dark-text-primary text-xl mb-4">Interesser</h3><div className="flex flex-wrap gap-2">{eventInterests.map(interest => (<span key={`int-${interest.id}`} className="bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light px-3 py-1.5 rounded-full text-sm font-medium">{interest.name}</span>))}</div></div>)}</div>)}
                    <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border"><div className="flex items-center gap-3 mb-6"><div className="p-2 bg-primary-light dark:bg-primary/20 rounded-full"><Users className="text-primary" size={20} /></div><h3 className="font-bold text-text-primary dark:text-dark-text-primary text-xl">Deltagere ({event.participants?.length || 0})</h3></div>{participantsToShow.length > 0 ? (<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">{participantsToShow.map(user => (<div key={user.id} className="text-center group"><div className="relative"><PrivateImage src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-gray-100 dark:border-dark-border group-hover:border-primary transition-colors" />{user.online && (<div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-dark-surface rounded-full"></div>)}</div><p className="text-sm mt-2 truncate font-semibold text-text-secondary dark:text-dark-text-secondary group-hover:text-primary transition-colors">{user.name}</p></div>))}{remainingParticipants > 0 && (<div className="text-center"><div className="w-16 h-16 rounded-full bg-primary-light dark:bg-primary/20 flex items-center justify-center mx-auto border-2 border-primary/30"><span className="font-bold text-primary text-sm">+{remainingParticipants}</span></div><p className="text-sm mt-2 font-semibold text-text-secondary dark:text-dark-text-secondary">flere</p></div>)}</div>) : (<div className="text-center py-8"><div className="w-16 h-16 bg-gray-100 dark:bg-dark-surface-light rounded-full flex items-center justify-center mx-auto mb-3"><Users className="text-gray-400" size={24} /></div><p className="text-text-secondary dark:text-dark-text-secondary">Ingen deltagere endnu</p><p className="text-text-secondary dark:text-dark-text-secondary text-sm mt-1">Vær den første til at tilmelde dig! 🎉</p></div>)}</div>
                    <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border"><h3 className="font-bold text-text-primary dark:text-dark-text-primary text-xl mb-4">Om eventet</h3><div className="prose prose-gray dark:prose-invert max-w-none"><MarkdownRenderer text={event.description || 'Ingen beskrivelse tilgængelig.'} /></div></div>
                </div>
            </main>
            
            <footer className="sticky bottom-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border p-4 z-10">
                <div className="max-w-4xl mx-auto md:flex md:space-x-4 space-y-3 md:space-y-0">
                    {isJoined ? (<EventChatButton />) : (<button onClick={() => setShowShareModal(true)} className="w-full md:w-auto md:flex-1 bg-primary-light text-primary dark:bg-dark-surface-light dark:text-dark-text-primary font-bold py-3 px-4 rounded-full text-lg transition duration-300 hover:bg-primary/20 dark:hover:bg-dark-border">Del med soulmate 😎</button>)}
                    <button onClick={handleToggleJoin} disabled={isJoining} className={`w-full md:w-auto md:flex-1 text-white font-bold py-3 px-4 rounded-full text-lg transition duration-300 shadow-lg flex items-center justify-center ${isJoined ? 'bg-gray-500 hover:bg-gray-600' : 'bg-primary hover:bg-primary-dark'} disabled:opacity-70`}>
                        {isJoining ? <Loader2 className="animate-spin" /> : (isJoined ? 'Tilmeldt' : 'Deltag')}
                    </button>
                </div>
            </footer>
             
            {showShareModal && (<ShareModal title="Del event med en Soulmate" soulmates={soulmates} onShare={handleShare} onClose={() => setShowShareModal(false)} />)}
            {shareConfirmation && (<div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-bold py-2 px-4 rounded-full z-50">{shareConfirmation}</div>)}
        </div>
    );
};

export default EventDetailPage;