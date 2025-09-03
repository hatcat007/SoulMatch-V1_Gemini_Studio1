import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { User } from '../types';
import { ArrowLeft, Users, MessageSquare, BarChart2, AlertTriangle, UserCog, Ghost } from 'lucide-react';

const AdminPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [stats, setStats] = useState({ users: 0, events: 0, threads: 0 });
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const checkAdminStatus = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                navigate('/login');
                return;
            }

            const { data: profile, error } = await supabase
                .from('users')
                .select('is_admin')
                .eq('auth_id', authUser.id)
                .single();

            if (error || !profile?.is_admin) {
                navigate('/home');
            } else {
                setIsAdmin(true);
                fetchData();
            }
        };

        const fetchData = async () => {
            // Fetch stats
            const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
            const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
            const { count: threadsCount } = await supabase.from('message_threads').select('*', { count: 'exact', head: true });
            setStats({ users: usersCount ?? 0, events: eventsCount ?? 0, threads: threadsCount ?? 0 });

            // Fetch all users
            const { data: usersData } = await supabase.from('users').select('*').order('created_at', { ascending: false });
            if (usersData) {
                setAllUsers(usersData);
            }
            setLoading(false);
        };

        checkAdminStatus();
    }, [navigate]);

    const handleMatchAll = async () => {
        const confirmation = window.confirm(
            "ADVARSEL: Denne handling vil slette ALLE eksisterende chats og derefter oprette nye chats mellem HVER ENESTE bruger. Dette kan ikke fortrydes og er en meget tung operation. Er du helt sikker?"
        );

        if (!confirmation) return;

        setActionLoading(true);
        setActionMessage(null);

        try {
            // 1. Delete existing connections
            setActionMessage({ type: 'success', text: 'Sletter gamle chats...' });
            const { error: deleteParticipantsError } = await supabase.from('message_thread_participants').delete().neq('thread_id', 0); // Dummy condition to delete all
            if (deleteParticipantsError) throw deleteParticipantsError;
            
            const { error: deleteThreadsError } = await supabase.from('message_threads').delete().neq('id', 0);
            if (deleteThreadsError) throw deleteThreadsError;

            // 2. Get all users
            setActionMessage({ type: 'success', text: 'Henter brugere...' });
            const { data: users, error: usersError } = await supabase.from('users').select('id');
            if (usersError) throw usersError;
            if (!users || users.length < 2) {
                throw new Error("Ikke nok brugere til at oprette matches.");
            }

            const userIds = users.map(u => u.id);
            const pairs: [number, number][] = [];
            for (let i = 0; i < userIds.length; i++) {
                for (let j = i + 1; j < userIds.length; j++) {
                    pairs.push([userIds[i], userIds[j]]);
                }
            }
            
            setActionMessage({ type: 'success', text: `Opretter ${pairs.length} nye chats...` });

            // 3. Create new threads and participants for each pair
            for (const pair of pairs) {
                const { data: newThread, error: threadError } = await supabase
                    .from('message_threads')
                    .insert({ match_timestamp: new Date().toISOString() })
                    .select()
                    .single();
                
                if (threadError) throw threadError;

                const participants = [
                    { thread_id: newThread.id, user_id: pair[0] },
                    { thread_id: newThread.id, user_id: pair[1] },
                ];
                
                const { error: participantsError } = await supabase.from('message_thread_participants').insert(participants);
                if (participantsError) throw participantsError;
            }

            setActionMessage({ type: 'success', text: `Færdig! ${pairs.length} chats blev oprettet.` });
        } catch (error: any) {
            setActionMessage({ type: 'error', text: `Fejl: ${error.message}` });
        } finally {
            setActionLoading(false);
        }
    };
    
    if (loading || !isAdmin) {
        return <div className="p-4 text-center">Verifying access...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-red-600">Admin Panel</h1>
                <div className="w-8"></div> {/* Spacer */}
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                
                {/* Stats */}
                <section>
                    <h2 className="text-lg font-bold text-text-primary dark:text-dark-text-primary mb-2">System Oversigt</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm text-center">
                            <Users className="mx-auto text-primary mb-2" size={24}/>
                            <p className="text-2xl font-bold">{stats.users}</p>
                            <p className="text-sm text-text-secondary">Brugere</p>
                        </div>
                         <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm text-center">
                            <BarChart2 className="mx-auto text-primary mb-2" size={24}/>
                            <p className="text-2xl font-bold">{stats.events}</p>
                            <p className="text-sm text-text-secondary">Events</p>
                        </div>
                         <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm text-center">
                            <MessageSquare className="mx-auto text-primary mb-2" size={24}/>
                            <p className="text-2xl font-bold">{stats.threads}</p>
                            <p className="text-sm text-text-secondary">Aktive Chats</p>
                        </div>
                    </div>
                </section>
                
                {/* Actions */}
                <section>
                    <h2 className="text-lg font-bold text-text-primary dark:text-dark-text-primary mb-2">Handlinger</h2>
                    <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm">
                        <div className="flex items-start">
                            <AlertTriangle className="text-red-500 mr-3 mt-1 flex-shrink-0" size={24}/>
                            <div>
                                <h3 className="font-bold text-text-primary">Gennemtving Match For Alle</h3>
                                <p className="text-sm text-text-secondary my-2">Dette er en destruktiv handling. Den sletter alle nuværende chats og opretter nye chat-threads mellem alle brugere i systemet. Bruges kun til testformål.</p>
                                <button
                                    onClick={handleMatchAll}
                                    disabled={actionLoading}
                                    className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-red-700 transition duration-300 disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {actionLoading ? 'Arbejder...' : 'Kør Match All'}
                                </button>
                                {actionMessage && (
                                    <p className={`mt-2 text-sm font-semibold ${actionMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                                        {actionMessage.text}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* More Ideas */}
                <section>
                    <h2 className="text-lg font-bold text-text-primary dark:text-dark-text-primary mb-2">Flere Værktøjer (Ideer)</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm opacity-60">
                            <div className="flex items-center">
                                <UserCog className="text-gray-400 mr-3" size={24}/>
                                <div>
                                    <h3 className="font-bold text-text-primary">Bruger Håndtering</h3>
                                    <p className="text-sm text-text-secondary">Se, ban, eller giv admin-rettigheder til brugere.</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm opacity-60">
                             <div className="flex items-center">
                                <Ghost className="text-gray-400 mr-3" size={24}/>
                                <div>
                                    <h3 className="font-bold text-text-primary">Impersoner Bruger</h3>
                                    <p className="text-sm text-text-secondary">Log ind som en anden bruger for at debugge.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* User List */}
                <section>
                    <h2 className="text-lg font-bold text-text-primary dark:text-dark-text-primary mb-2">Brugerliste</h2>
                    <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden">
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-dark-surface-light sticky top-0">
                                    <tr>
                                        <th className="p-3 font-semibold">Navn</th>
                                        <th className="p-3 font-semibold">Status</th>
                                        <th className="p-3 font-semibold">ID</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                                    {allUsers.map(user => (
                                        <tr key={user.id}>
                                            <td className="p-3 font-medium">{user.name}</td>
                                            <td className="p-3">
                                                {user.is_admin ? (
                                                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">Admin</span>
                                                ) : (
                                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">User</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-text-secondary">{user.id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AdminPage;
