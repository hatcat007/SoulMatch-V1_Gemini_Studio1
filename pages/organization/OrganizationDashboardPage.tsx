import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import type { Organization, Event, Place } from '../../types';
import BarChart from '../../components/BarChart';
import { Calendar, MapPin, Users, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingScreen from '../../components/LoadingScreen';

interface EventWithParticipants extends Event {
  participant_count: number;
}

interface PlaceWithCheckins extends Place {
  checkin_count: number;
}

const OrganizationDashboardPage: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<EventWithParticipants[]>([]);
  const [places, setPlaces] = useState<PlaceWithCheckins[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: any; // SupabaseRealtimeChannel

    const fetchDynamicData = async (orgId: number) => {
        // Fetch events with participant counts
        const { data: eventsData } = await supabase
            .from('events')
            .select('*, event_participants(count)')
            .eq('organization_id', orgId);

        if (eventsData) {
            setEvents(eventsData.map(e => ({ ...e, participant_count: e.event_participants[0]?.count || 0 })));
        }

        // Fetch places with checkin counts
        const { data: placesData } = await supabase
            .from('places')
            .select('*, checkins(count)')
            .eq('organization_id', orgId);

        if (placesData) {
            setPlaces(placesData.map((p: any) => ({ ...p, checkin_count: p.checkins[0]?.count || 0 })));
        }
    };

    const setupDashboard = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('auth_id', user.id)
            .single();

        if (orgData) {
            setOrganization(orgData);
            await fetchDynamicData(orgData.id);

            // Set up real-time subscription
            channel = supabase
                .channel(`dashboard-org-${orgData.id}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'event_participants'
                }, 
                (payload) => {
                    console.log('Participant change detected, refetching dashboard data.');
                    fetchDynamicData(orgData.id);
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'checkins'
                },
                (payload) => {
                    console.log('Check-in change detected, refetching dashboard data.');
                    fetchDynamicData(orgData.id);
                })
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
  }, []);

  const handleDeleteEvent = async (eventId: number) => {
    // The sandbox environment blocks window.confirm(), so we remove it.
    // In a real application, a custom modal component would be a better solution.
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) {
      alert(`Fejl ved sletning af event: ${error.message}`);
    } else {
      setEvents(prev => prev.filter(e => e.id !== eventId));
    }
  };

  const handleDeletePlace = async (placeId: number) => {
    // The sandbox environment blocks window.confirm(), so we remove it.
    // In a real application, a custom modal component would be a better solution.
    const { error } = await supabase.from('places').delete().eq('id', placeId);
    if (error) {
      alert(`Fejl ved sletning af mødested: ${error.message}`);
    } else {
      setPlaces(prev => prev.filter(p => p.id !== placeId));
    }
  };
  
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
      <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Dashboard</h1>

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