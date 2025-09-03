import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MessageThread, User } from '../types';
import NotificationIcon from '../components/NotificationIcon';
import { supabase } from '../services/supabase';

const ChatListPage: React.FC = () => {
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const [threads, setThreads] = useState<MessageThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const aiMentorThread: MessageThread = {
      id: 'ai-mentor',
      last_message: 'Din personlige AI mentor til samtaler.',
      timestamp: new Date().toISOString(),
      unread_count: 0,
      participants: [{ user: {
        id: -1,
        name: 'SoulMatch AI mentor',
        age: 0,
        avatar_url: 'https://q1f3.c3.e2-9.dev/soulmatch-uploads-public/bot.png', // New bot icon
        online: true,
      }}]
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) { setLoading(false); return; }

            const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('id')
                .eq('auth_id', authUser.id)
                .single();

            if (profileError || !userProfile) {
                console.error('Error fetching user profile:', profileError);
                setLoading(false);
                return;
            }
            const userId = userProfile.id;
            setCurrentUserId(userId);

            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .eq('online', true)
                .neq('id', userId); // Exclude current user
            if (usersError) console.error('Error fetching online users:', usersError);
            else setOnlineUsers(usersData || []);

            const { data: threadParticipants, error: tpError } = await supabase
                .from('message_thread_participants')
                .select('thread_id')
                .eq('user_id', userId);

            if (tpError) {
                console.error('Error fetching thread participants:', tpError);
                setLoading(false);
                return;
            }

            const threadIds = threadParticipants.map(p => p.thread_id);
            if (threadIds.length > 0) {
                const { data: threadsData, error: threadsError } = await supabase
                    .from('message_threads')
                    .select(`
                        *,
                        participants:message_thread_participants (
                            user:users (*)
                        )
                    `)
                    .in('id', threadIds);
                
                if (threadsError) {
                    console.error('Error fetching message threads:', threadsError);
                } else {
                    setThreads(threadsData as any || []);
                }
            }
            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="p-4 text-center">Loading chats...</div>;
    }
    
    const getOtherParticipant = (thread: MessageThread): User | null => {
        if (thread.id === 'ai-mentor') return thread.participants[0].user;
        const participant = thread.participants.find(p => p.user && p.user.id !== currentUserId);
        return participant ? participant.user : null;
    }

    const allThreads = [aiMentorThread, ...threads];

    return (
        <div className="p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <div className="w-10"></div> {/* Spacer */}
                <h1 className="text-3xl font-bold text-primary">SoulMatch</h1>
                <NotificationIcon />
            </div>
            <div className="relative mb-6">
                <input
                    type="text"
                    placeholder="Søg i chat"
                    className="w-full bg-gray-100 border border-gray-200 rounded-full py-3 pl-10 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>

            <div>
                <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-3">Online nu</h2>
                {onlineUsers.length > 0 ? (
                    <div className="flex space-x-4 overflow-x-auto pb-3 scrollbar-hide">
                        {onlineUsers.map(user => (
                            <div key={user.id} className="flex flex-col items-center text-center w-20 flex-shrink-0">
                                <div className="relative">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full object-cover shadow-md" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold shadow-md">
                                            {user.name.charAt(0)}
                                        </div>
                                    )}
                                    <span className="absolute bottom-0.5 right-0.5 block h-4 w-4 rounded-full bg-green-400 border-2 border-white dark:border-dark-surface animate-pulse-slow"></span>
                                </div>
                                <p className="mt-2 text-sm font-semibold text-text-secondary dark:text-dark-text-secondary truncate w-full">{user.name}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-text-secondary dark:text-dark-text-secondary bg-gray-50 dark:bg-dark-surface-light p-4 rounded-lg">
                        Ingen er online lige nu.
                    </div>
                )}
            </div>

            <div className="mt-6 flex-1">
                <h2 className="text-lg font-semibold text-text-primary mb-3">Alle beskeder</h2>
                <div className="space-y-2">
                    {allThreads.map(thread => {
                        const otherUser = getOtherParticipant(thread);
                        if (!otherUser) return null;

                        const formattedTimestamp = thread.timestamp ? new Date(thread.timestamp).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }) : '';

                        return (
                            <Link to={`/chat/${thread.id}`} key={thread.id} className="flex items-center p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                                <img src={otherUser.avatar_url} alt={otherUser.name} className="w-14 h-14 rounded-full mr-4 object-cover" />
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-bold text-text-primary">{otherUser.name}</p>
                                    <p className="text-sm text-text-secondary truncate">{thread.last_message}</p>
                                </div>
                                <div className="text-right ml-2 flex-shrink-0">
                                    <p className="text-xs text-gray-400 mb-1">{formattedTimestamp}</p>
                                    {thread.unread_count > 0 && (
                                        <span className="bg-primary text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center ml-auto">
                                            {thread.unread_count}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ChatListPage;