import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserX, UserMinus, Loader2, UserPlus, BrainCircuit } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { User, Friendship } from '../types';
import LoadingScreen from '../components/LoadingScreen';

interface FriendshipWithUser extends Friendship {
    friend: User;
}

const FriendsPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState<'friends' | 'requests' | 'matches'>('friends');
    const [friends, setFriends] = useState<FriendshipWithUser[]>([]);
    const [requests, setRequests] = useState<FriendshipWithUser[]>([]);
    const [matches, setMatches] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [matchLoading, setMatchLoading] = useState(false);
    const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const fetchFriendData = useCallback(async () => {
        setLoading(true);

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setLoading(false); navigate('/login'); return; }

        const { data: userProfile } = await supabase.from('users').select('*').eq('auth_id', authUser.id).single();
        if (!userProfile) { setLoading(false); return; }
        setCurrentUserId(userProfile.id);

        const { data: friendships, error } = await supabase
            .from('friends')
            .select('*, user1:users!friends_user_id_1_fkey(*), user2:users!friends_user_id_2_fkey(*)')
            .or(`user_id_1.eq.${userProfile.id},user_id_2.eq.${userProfile.id}`);

        if (error) {
            console.error('Error fetching friendships:', error);
        } else {
            const accepted: FriendshipWithUser[] = [];
            const pending: FriendshipWithUser[] = [];

            friendships.forEach((f: any) => {
                const friendUser = f.user_id_1 === userProfile.id ? f.user2 : f.user1;
                if (!friendUser) return;
                
                const friendshipWithUser: FriendshipWithUser = { ...f, friend: friendUser };

                if (f.status === 'accepted') {
                    accepted.push(friendshipWithUser);
                } else if (f.status === 'pending' && f.action_user_id !== userProfile.id) {
                    pending.push(friendshipWithUser);
                }
            });

            setFriends(accepted);
            setRequests(pending);
        }
        setLoading(false);
    }, [navigate]);
    
    useEffect(() => {
        fetchFriendData();
    }, [fetchFriendData]);

    const fetchMatches = useCallback(async () => {
        if (!currentUserId) return;
        setMatchLoading(true);

        // 1. Get existing relationships to exclude
        const { data: friendships } = await supabase
            .from('friends')
            .select('user_id_1, user_id_2')
            .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);
            
        const existingRelations = new Set(friendships?.map(f => f.user_id_1 === currentUserId ? f.user_id_2 : f.user_id_1));
        existingRelations.add(currentUserId);

        // 2. Get all users
        const { data: allUsersData, error: usersError } = await supabase
            .from('users')
            .select('*');
            
        if (usersError) {
            console.error("Error fetching users for matches:", usersError);
            setMatchLoading(false);
            return;
        }

        // 3. Filter out users who are already related
        const potentialMatches = allUsersData?.filter(u => !existingRelations.has(u.id)) || [];
        
        setMatches(potentialMatches);
        setMatchLoading(false);
    }, [currentUserId]);

    useEffect(() => {
        if (currentTab === 'matches' && matches.length === 0) {
            fetchMatches();
        }
    }, [currentTab, matches.length, fetchMatches]);

    const handleAcceptRequest = async (friendshipId: number, friendId: number) => {
        // 1. Update friendship status optimistically
        const originalRequests = requests;
        setRequests(prev => prev.filter(r => r.id !== friendshipId));

        const { error: updateError } = await supabase
            .from('friends')
            .update({ status: 'accepted' })
            .eq('id', friendshipId);

        if (updateError) {
            console.error('Error accepting request:', updateError);
            setRequests(originalRequests); // Revert on error
            return;
        }

        // 2. Use RPC to get/create chat thread
        const { data: threadId, error: rpcError } = await supabase
            .rpc('get_or_create_chat_thread', { p_friend_id: friendId });
        
        if (rpcError || !threadId) {
            console.error('Error creating thread via RPC:', rpcError?.message || 'No thread ID returned');
            // Revert friendship status on error
            await supabase.from('friends').update({ status: 'pending' }).eq('id', friendshipId);
            setRequests(originalRequests);
            return;
        }

        // 3. Navigate to chat
        navigate(`/chat/${threadId}`);
    };

    const handleDeclineRequest = async (friendshipId: number) => {
        const { error } = await supabase.from('friends').delete().eq('id', friendshipId);
        if (error) console.error('Error declining request:', error);
        else await fetchFriendData();
    };

    const handleRemoveFriend = async (friendshipId: number) => {
        // The sandbox environment blocks window.confirm(), so we remove it.
        const { error } = await supabase.from('friends').delete().eq('id', friendshipId);
        if (error) console.error('Error removing friend:', error);
        else await fetchFriendData();
    };

    const handleSendFriendRequest = async (friendId: number) => {
        if (!currentUserId) return;

        setSentRequests(prev => new Set(prev).add(friendId));

        const u1 = Math.min(currentUserId, friendId);
        const u2 = Math.max(currentUserId, friendId);

        await supabase.from('friends').insert({
            user_id_1: u1,
            user_id_2: u2,
            action_user_id: currentUserId,
            status: 'pending'
        });
    };
    
    const renderList = (list: FriendshipWithUser[]) => {
        if (loading) return <LoadingScreen message="Indlæser..." />;
        if (list.length === 0) {
            return (
                <div className="text-center p-8 text-text-secondary">
                    <p>{currentTab === 'friends' ? 'Du har ingen venner endnu.' : 'Ingen nye venneanmodninger.'}</p>
                </div>
            );
        }

        return (
            <div className="space-y-2">
                {list.map(({ id, friend }) => (
                    <div key={id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                        <div className="flex items-center">
                            <img src={friend.avatar_url} alt={friend.name} className="w-12 h-12 rounded-full mr-3" />
                            <span className="font-semibold text-text-primary dark:text-dark-text-primary">{friend.name}</span>
                        </div>
                        {currentTab === 'requests' ? (
                            <div className="flex space-x-2 items-center">
                                <button onClick={() => handleAcceptRequest(id, friend.id)} className="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary-dark font-semibold text-sm transition-colors">
                                    Start match
                                </button>
                                <button onClick={() => handleDeclineRequest(id)} className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200" aria-label="Decline">
                                    <UserX size={20} />
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => handleRemoveFriend(id)} className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 dark:bg-dark-surface-light dark:text-dark-text-secondary" aria-label="Remove friend">
                                <UserMinus size={20} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderMatches = () => {
        if (matchLoading) {
            return (
                <div className="text-center p-8 text-text-secondary flex flex-col items-center">
                    <Loader2 size={32} className="animate-spin text-primary mb-4" />
                    <p className="font-semibold">Finder nye SoulMatches...</p>
                    <p className="text-sm">Et øjeblik.</p>
                </div>
            );
        }
        if (matches.length === 0) {
            return (
                 <div className="text-center p-8 text-text-secondary">
                    <p>Vi kunne ikke finde nye matches lige nu.</p>
                    <p className="text-sm">Prøv igen senere!</p>
                </div>
            );
        }
        return (
            <div className="space-y-2">
                {matches.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                        <div className="flex items-center">
                            <img src={user.avatar_url} alt={user.name} className="w-12 h-12 rounded-full mr-3 object-cover" />
                            <div>
                                <span className="font-semibold text-text-primary dark:text-dark-text-primary">{user.name}</span>
                                <p className="text-xs text-text-secondary line-clamp-1">{user.bio}</p>
                            </div>
                        </div>
                        {sentRequests.has(user.id) ? (
                            <button disabled className="px-3 py-2 bg-gray-200 text-gray-500 rounded-full text-sm font-semibold cursor-not-allowed">
                                Anmodning sendt
                            </button>
                        ) : (
                            <button onClick={() => handleSendFriendRequest(user.id)} className="p-2 bg-primary-light text-primary rounded-full hover:bg-primary/20" aria-label="Add friend">
                                <UserPlus size={20} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
    };


    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Mine Venner</h1>
                <div className="w-8"></div>
            </header>
            
            <nav className="flex-shrink-0 border-b border-gray-200 dark:border-dark-border">
                <div className="flex justify-around">
                    <button
                        onClick={() => setCurrentTab('friends')}
                        className={`w-full py-3 text-center font-semibold transition-colors ${currentTab === 'friends' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`}
                    >
                        Venner ({friends.length})
                    </button>
                    <button
                        onClick={() => setCurrentTab('requests')}
                        className={`w-full py-3 text-center font-semibold transition-colors relative ${currentTab === 'requests' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`}
                    >
                        Anmodninger
                        {requests.length > 0 && <span className="absolute top-2 right-4 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{requests.length}</span>}
                    </button>
                    <button
                        onClick={() => setCurrentTab('matches')}
                        className={`w-full py-3 text-center font-semibold transition-colors flex items-center justify-center ${currentTab === 'matches' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`}
                    >
                         <BrainCircuit size={16} className="mr-1.5"/> SoulMatches
                    </button>
                </div>
            </nav>

            <main className="flex-1 overflow-y-auto p-4">
                {currentTab === 'friends' && renderList(friends)}
                {currentTab === 'requests' && renderList(requests)}
                {currentTab === 'matches' && renderMatches()}
            </main>
        </div>
    );
};

export default FriendsPage;