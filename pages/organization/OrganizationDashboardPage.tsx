import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import type { Organization, Event, Place, MessageThread, User } from '../../types';
import BarChart from '../../components/BarChart';
import { Calendar, MapPin, Users, CheckCircle, Edit, Trash2, MessageSquare, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingScreen from '../../components/LoadingScreen';
import { fetchPrivateFile } from '../../services/s3Service';
import { motion, AnimatePresence } from 'framer-motion';

interface EventWithParticipants extends Event {
  participant_count: number;
}

interface PlaceWithCheckins extends Place {
  checkin_count: number;
}

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            fetchPrivateFile(src).then(url => { objectUrl = url; setImageUrl(url); });
        }
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [src]);

    if (!imageUrl) return <div className={`${className} bg-gray-200 animate-pulse`} />;
    return <img src={imageUrl} alt={alt} className={className} />;
};

const WelcomeModal: React.FC<{ organizationName: string; onClose: () => void }> = ({ organizationName, onClose }) => (
    <motion.div
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
    >
        <motion.div
            className="bg-white dark:bg-dark-surface rounded-2xl p-6 md:p-8 w-full max-w-lg relative text-text-primary dark:text-dark-text-primary"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="text-center mb-6">
                 <div className="inline-block p-3 bg-primary-light dark:bg-primary/20 rounded-full mb-4">
                    <Sparkles size={32} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Velkommen til dit dashboard, {organizationName}!</h2>
            </div>
            
            <div className="text-sm text-text-secondary dark:text-dark-text-secondary space-y-4">
                <p className="font-semibold text-text-primary dark:text-dark-text-primary">Udforsk Jeres Dashboard & Opret Indhold</p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                    <li>Når I logger ind, lander I direkte på jeres <strong className="text-primary">Dashboard</strong>.</li>
                    <li>Brug navigationen i venstre side (eller i bunden på mobil) til at gå i gang.</li>
                    <li>Klik på <strong className="text-primary">"Opret Event"</strong> for at lave jeres første arrangement.</li>
                    <li>Klik på <strong className="text-primary">"Opret Mødested"</strong> for at registrere jeres lokation.</li>
                    <li>Klik på <strong className="text-primary">"Importer Event"</strong> for at prøve vores smarte AI-funktion.</li>
                    <li>Gå til <strong className="text-primary">"Indstillinger"</strong> for at finjustere jeres profil.</li>
                </ul>
                <p className="pt-2">Vi glæder os til at se jer på platformen og til at skabe positive forandringer sammen!</p>
                <p className="font-semibold text-right">- Teamet bag SoulMatch DK</p>
            </div>

            <div className="mt-8 text-center">
                 <button
                    onClick={onClose}
                    className="bg-primary text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-primary-dark transition-colors shadow-lg"
                >
                    Kom i gang!
                </button>
            </div>
        </motion.div>
    </motion.div>
);

const OrganizationDashboardPage: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<EventWithParticipants[]>([]);
  const [places, setPlaces] = useState<PlaceWithCheckins[]>([]);
  const [recentChats, setRecentChats] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const fetchDashboardChats = useCallback(async () => {
      // The new unified RLS policies allow us to query the table directly.
      // Supabase will only return threads the organization's host is part of.
      const { data: threadsData, error } = await supabase
        .from('message_threads')
        .select(`
            *,
            participants:message_thread_participants(user:users(*))
        `)
        .gt('unread_count', 0) // Only fetch threads with new/unread messages
        .order('timestamp', { ascending: false })
        .limit(5);
        
      if (error) {
          console.error("Error fetching org chats:", error.message);
          return;
      }
      if (threadsData) {
          const typedThreads = (threadsData as any[]).map(thread => ({
              ...thread,
              participants: thread.participants || []
          }));
          setRecentChats(typedThreads as MessageThread[]);
      }
  }, []);

  const fetchStats = useCallback(async (orgId: number) => {
    const eventsPromise = supabase.from('events').select('*, event_participants(count)').eq('organization_id', orgId);
    const placesPromise = supabase.from('places').select('*, checkins(count)').eq('organization_id', orgId);
    
    const [eventsRes, placesRes] = await Promise.all([eventsPromise, placesPromise]);

    if (eventsRes.data) {
        setEvents(eventsRes.data.map(e => ({ ...e, participant_count: e.event_participants[0]?.count || 0 })));
    }
    if (placesRes.data) {
        setPlaces(placesRes.data.map((p: any) => ({ ...p, checkin_count: p.checkins[0]?.count || 0 })));
    }
  }, []);

  useEffect(() => {
    let channel: any; // SupabaseRealtimeChannel

    const setupDashboard = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data: orgData } = await supabase.from('organizations').select('*').eq('auth_id', user.id).single();

        if (orgData) {
            setOrganization(orgData);
            
            // Check if welcome modal should be shown
            const welcomeModalShownKey = `welcomeModalShown_org_${orgData.id}`;
            if (!sessionStorage.getItem(welcomeModalShownKey)) {
                setShowWelcomeModal(true);
                sessionStorage.setItem(welcomeModalShownKey, 'true');
            }

            await Promise.all([
                fetchStats(orgData.id),
                fetchDashboardChats()
            ]);

            channel = supabase.channel(`dashboard-org-${orgData.id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => fetchStats(orgData.id))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, () => fetchStats(orgData.id))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchDashboardChats())
                .subscribe();
        }
        setLoading(false);
    };

    setupDashboard();

    return () => {
        if (channel) {
            supabase.removeChannel(channel);
        }
    };
  }, [fetchStats, fetchDashboardChats]);

  const handleDeleteEvent = async (eventId: number) => {
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) {
      alert(`Fejl ved sletning af event: ${error.message}`);
    } else {
      setEvents(prev => prev.filter(e => e.id !== eventId));
    }
  };

  const handleDeletePlace = async (placeId: number) => {
    const { error } = await supabase.from('places').delete().eq('id', placeId);
    if (error) {
      alert(`Fejl ved sletning af mødested: ${error.message}`);
    } else {
      setPlaces(prev => prev.filter(p => p.id !== placeId));
    }
  };

  const getOtherParticipant = (thread: MessageThread): User | null => {
    if (!organization) return null;
    const participant = thread.participants.find(p => {
        if (!p.user) return false;
        // The user object is nested inside the participant object
        return p.user.name !== organization.host_name;
    });
    return participant?.user || null;
  }
  
  if (loading) {
    return <LoadingScreen message="Loading Dashboard..." />;
  }
  if (!organization) {
    return <div className="p-8 text-center">Could not find organization data.</div>;
  }
  
  const eventChartData = events
    .sort((a, b) => b.participant_count - a.participant_count)
    .slice(0, 5)
    .map(e => ({ label: e.title, value: e.participant_count }));
    
  const placeChartData = places
    .sort((a, b) => b.checkin_count - a.checkin_count)
    .slice(0, 5)
    .map(p => ({ label: p.name, value: p.checkin_count }));

  return (
    <div className="p-6 md:p-8">
        <AnimatePresence>
            {showWelcomeModal && <WelcomeModal organizationName={organization.name} onClose={() => setShowWelcomeModal(false)} />}
        </AnimatePresence>

      <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Dashboard</h1>
      
      <section className="mt-8">
        <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Nye beskeder</h2>
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-4 space-y-3">
            {recentChats.length > 0 ? recentChats.map(thread => {
                const otherUser = getOtherParticipant(thread);
                if (!otherUser) return null;

                return (
                    <Link to={`/chat/${thread.id}`} key={thread.id} className="flex items-center p-2 rounded-md hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                        <div className="flex-shrink-0 w-10 h-10 mr-3">
                            <PrivateImage src={otherUser.avatar_url} alt={otherUser.name} className="w-full h-full rounded-full object-cover" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-semibold text-text-primary dark:text-dark-text-primary">Ny besked fra {otherUser.name}</p>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary truncate">{thread.last_message}</p>
                        </div>
                         <div className="text-right ml-2">
                            <p className="text-xs text-gray-400">{new Date(thread.timestamp).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </Link>
                );
            }) : <p className="text-center text-text-secondary dark:text-dark-text-secondary p-4">Ingen nye beskeder.</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Statistik</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarChart data={eventChartData} title="Deltagere pr. Event (Top 5)" />
            <BarChart data={placeChartData} title="Check-ins pr. Mødested (Top 5)" />
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
            <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Mine Events</h2>
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-4 space-y-3 max-h-96 overflow-y-auto">
                {events.length > 0 ? events.map(event => (
                    <div key={event.id} className="flex items-center p-2 rounded-md hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                        <div className="p-2 bg-primary-light dark:bg-primary/20 rounded-md mr-3"><Calendar className="text-primary" /></div>
                        <div className="flex-1">
                            <p className="font-semibold">{event.title}</p>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{new Date(event.time).toLocaleDateString('da-DK')}</p>
                        </div>
                        <div className="flex items-center text-sm font-semibold mr-4">
                            <Users size={16} className="mr-1.5" />
                            {event.participant_count}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Link to={`/edit-event/${event.id}`} className="p-2 text-gray-500 hover:text-primary dark:hover:text-dark-text-primary rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-light">
                                <Edit size={18} />
                            </Link>
                            <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-light">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                )) : <p className="text-center text-text-secondary dark:text-dark-text-secondary p-4">Ingen events oprettet.</p>}
            </div>
        </div>
        <div>
            <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Mine Mødesteder</h2>
             <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-4 space-y-3 max-h-96 overflow-y-auto">
                {places.length > 0 ? places.map(place => (
                    <div key={place.id} className="flex items-center p-2 rounded-md hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                        <div className="p-2 bg-primary-light dark:bg-primary/20 rounded-md mr-3"><MapPin className="text-primary" /></div>
                        <div className="flex-1">
                            <p className="font-semibold">{place.name}</p>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{place.address}</p>
                        </div>
                         <div className="flex items-center text-sm font-semibold mr-4">
                            <CheckCircle size={16} className="mr-1.5" />
                            {place.checkin_count}
                        </div>
                         <div className="flex items-center space-x-2">
                            <Link to={`/edit-place/${place.id}`} className="p-2 text-gray-500 hover:text-primary dark:hover:text-dark-text-primary rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-light">
                                <Edit size={18} />
                            </Link>
                            <button onClick={() => handleDeletePlace(place.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-light">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                )) : <p className="text-center text-text-secondary dark:text-dark-text-secondary p-4">Ingen mødesteder oprettet.</p>}
            </div>
        </div>
      </section>
    </div>
  );
};

export default OrganizationDashboardPage;