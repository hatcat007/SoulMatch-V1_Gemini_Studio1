import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, UserX, UserMinus } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { User, Friendship } from '../types';

interface FriendshipWithUser extends Friendship {
    friend: User;
}

const FriendsPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState<'friends' | 'requests'>('friends');
    const [friends, setFriends] = useState<FriendshipWithUser[]>([]);
    const [requests, setRequests] = useState<FriendshipWithUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFriendData = async () => {
        setLoading(true);

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setLoading(false); navigate('/login'); return; }

        const { data: userProfile } = await supabase.from('users').select('*').eq('auth_id', authUser.id).single();
        if (!userProfile) { setLoading(false); return; }

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
    };
    
    useEffect(() => {
        fetchFriendData();
    }, []);

    const handleAcceptRequest = async (friendshipId: number) => {
        const { error } = await supabase
            .from('friends')
            .update({ status: 'accepted' })
            .eq('id', friendshipId);
        if (error) console.error('Error accepting request:', error);
        else await fetchFriendData();
    };

    const handleDeclineRequest = async (friendshipId: number) => {
        const { error } = await supabase
            .from('friends')
            .delete()
            .eq('id', friendshipId);
        if (error) console.error('Error declining request:', error);
        else await fetchFriendData();
    };

    const handleRemoveFriend = async (friendshipId: number) => {
        if (window.confirm('Er du sikker på, at du vil fjerne denne ven?')) {
            const { error } = await supabase
                .from('friends')
                .delete()
                .eq('id', friendshipId);
            if (error) console.error('Error removing friend:', error);
            else await fetchFriendData();
        }
    };
    
    const renderList = (list: FriendshipWithUser[]) => {
        if (loading) return <div className="text-center p-4">Indlæser...</div>;
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
                            <div className="flex space-x-2">
                                <button onClick={() => handleAcceptRequest(id)} className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200" aria-label="Accept">
                                    <UserCheck size={20} />
                                </button>
                                <button onClick={() => handleDeclineRequest(id)} className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200" aria-label="Decline">
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
                </div>
            </nav>

            <main className="flex-1 overflow-y-auto p-4">
                {currentTab === 'friends' ? renderList(friends) : renderList(requests)}
            </main>
        </div>
    );
};

export default FriendsPage;