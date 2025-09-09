import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { User, Interest, Activity, Organization } from '../types';
import { ArrowLeft, Users, MessageSquare, BarChart2, AlertTriangle, UserCog, Ghost, Check, X, Building } from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';

interface PendingInterest extends Interest {
    organization: Pick<Organization, 'name'>;
}
interface PendingActivity extends Activity {
    organization: Pick<Organization, 'name'>;
}

const ApprovalQueue: React.FC = () => {
    const [pendingInterests, setPendingInterests] = useState<PendingInterest[]>([]);
    const [pendingActivities, setPendingActivities] = useState<PendingActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPending = async () => {
            setLoading(true);
            const interestsPromise = supabase.from('interests').select('*, organization:organizations(name)').eq('approved', false);
            const activitiesPromise = supabase.from('activities').select('*, organization:organizations(name)').eq('approved', false);

            const [interestsRes, activitiesRes] = await Promise.all([interestsPromise, activitiesPromise]);
            
            if (interestsRes.data) setPendingInterests(interestsRes.data as any);
            if (activitiesRes.data) setPendingActivities(activitiesRes.data as any);
            setLoading(false);
        };
        fetchPending();
    }, []);

    const handleApproval = async (id: number, type: 'interests' | 'activities', approve: boolean) => {
        if (approve) {
            const { error } = await supabase.from(type).update({ approved: true }).eq('id', id);
            if (!error) {
                if (type === 'interests') setPendingInterests(prev => prev.filter(i => i.id !== id));
                else setPendingActivities(prev => prev.filter(a => a.id !== id));
            }
        } else { // Reject
            const { error } = await supabase.from(type).delete().eq('id', id);
             if (!error) {
                if (type === 'interests') setPendingInterests(prev => prev.filter(i => i.id !== id));
                else setPendingActivities(prev => prev.filter(a => a.id !== id));
            }
        }
    };

    const ListComponent: React.FC<{ title: string, items: (PendingInterest | PendingActivity)[], type: 'interests' | 'activities' }> = ({ title, items, type }) => (
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm">
            <h3 className="font-bold text-text-primary dark:text-dark-text-primary mb-2">{title} ({items.length})</h3>
            {items.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-surface-light rounded-md">
                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-xs text-text-secondary dark:text-dark-text-secondary flex items-center"><Building size={12} className="mr-1"/> Foreslået af: {(item as any).organization?.name || 'Ukendt'}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => handleApproval(item.id, type, true)} className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200"><Check size={16}/></button>
                                <button onClick={() => handleApproval(item.id, type, false)} className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200"><X size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Ingen afventende forslag.</p>}
        </div>
    );
    
    if (loading) return <div>Indlæser forslag...</div>;

    return (
        <div className="grid md:grid-cols-2 gap-4">
            <ListComponent title="Interesser til godkendelse" items={pendingInterests} type="interests" />
            <ListComponent title="Aktiviteter til godkendelse" items={pendingActivities} type="activities" />
        </div>
    );
};

const AdminPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [stats, setStats] = useState({ users: 0, events: 0, threads: 0 });
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

        checkAdminStatus();
    }, [navigate]);

    const handleMatchAll = async () => {
        // Fix: The sandbox environment may block window.confirm(), so it has been removed for this context.
        // In a real application, a safer confirmation modal would be used for this destructive action.

        setActionLoading(true);
        setActionMessage(null);

        try {
            const { data, error } = await supabase.rpc('admin_match_all_users');
            if (error) throw error;

            setActionMessage({ type: 'success', text: data || 'Success! All users have been matched.' });
            // Refresh stats after the operation
            await fetchData();
        } catch (error: any) {
            setActionMessage({ type: 'error', text: `Fejl: ${error.message}` });
        } finally {
            setActionLoading(false);
        }
    };
    
    if (loading || !isAdmin) {
        return <LoadingScreen message="Verifying access..." />;
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

                 {/* Approvals */}
                <section>
                    <h2 className="text-lg font-bold text-text-primary dark:text-dark-text-primary mb-2">Godkendelser</h2>
                    <ApprovalQueue />
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