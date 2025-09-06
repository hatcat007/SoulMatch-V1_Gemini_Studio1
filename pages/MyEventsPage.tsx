
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Users, PlusCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Event } from '../types';
import LoadingScreen from '../components/LoadingScreen';

interface UserEvent extends Event {
    participantCount: number;
}

const MyEventCard: React.FC<{ event: UserEvent, onDelete: (id: number) => void }> = ({ event, onDelete }) => {
    return (
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm flex items-center justify-between">
            <div>
                <h3 className="font-bold text-text-primary dark:text-dark-text-primary">{event.title}</h3>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{new Date(event.time).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <div className="flex items-center text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                    <Users size={16} className="mr-1.5" />
                    <span>{event.participantCount} deltagere</span>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <Link to={`/edit-event/${event.id}`} className="p-2 text-gray-500 hover:text-primary dark:hover:text-dark-text-primary rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-light">
                    <Edit size={18} />
                </Link>
                <button onClick={() => onDelete(event.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-light">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};

const MyEventsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [events, setEvents] = useState<UserEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        if (!user) {
            if (!authLoading) navigate('/login');
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('*, event_participants(count)')
            .eq('creator_user_id', user.id)
            .order('time', { ascending: false });

        if (error) {
            console.error("Error fetching user's events:", error);
        } else {
            const userEvents = data.map(e => ({
                ...e,
                participantCount: e.event_participants?.[0]?.count || 0
            })) as UserEvent[];
            setEvents(userEvents);
        }
        setLoading(false);
    }, [user, authLoading, navigate]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleDelete = async (eventId: number) => {
        const { error } = await supabase.from('events').delete().eq('id', eventId);
        if (error) {
            alert(`Fejl ved sletning af event: ${error.message}`);
        } else {
            setEvents(prev => prev.filter(e => e.id !== eventId));
        }
    };

    if (authLoading || loading) {
        return <LoadingScreen message="Indlæser dine events..." />;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Mine Events</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-2xl mx-auto">
                    {events.length > 0 ? (
                        <div className="space-y-4">
                            {events.map(event => (
                                <MyEventCard key={event.id} event={event} onDelete={handleDelete} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-white dark:bg-dark-surface rounded-lg shadow-sm">
                            <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Du har ingen events</h2>
                            <p className="text-text-secondary dark:text-dark-text-secondary mt-2 mb-4">Det ser ud til, du ikke har oprettet nogle events endnu. Start et nyt socialt event og bring folk sammen!</p>
                            <Link to="/create" className="inline-flex items-center justify-center bg-primary text-white font-bold py-3 px-6 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg">
                                <PlusCircle size={20} className="mr-2" />
                                Opret dit første event
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MyEventsPage;
