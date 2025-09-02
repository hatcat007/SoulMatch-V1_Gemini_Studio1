import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MessageThread, User } from '../types';
import NotificationIcon from '../components/NotificationIcon';
import { supabase } from '../services/supabase';

// Assuming the current user's ID is 999 for fetching threads
const CURRENT_USER_ID = 999;

const ChatListPage: React.FC = () => {
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const [threads, setThreads] = useState<MessageThread[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Fetch online users
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .eq('online', true);
            if (usersError) console.error('Error fetching online users:', usersError);
            else setOnlineUsers(usersData || []);

            // Fetch message threads for the current user
            const { data: threadsData, error: threadsError } = await supabase
                .from('message_threads')
                .select(`
                    *,
                    participants:message_thread_participants (
                        user:users (*)
                    )
                `)
                .in('id', (await supabase.from('message_thread_participants').select('thread_id').eq('user_id', CURRENT_USER_ID)).data?.map(p => p.thread_id) || []);

            if (threadsError) {
                console.error('Error fetching message threads:', threadsError);
            } else {
                setThreads(threadsData || []);
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="p-4 text-center">Loading chats...</div>;
    }

    // Function to get the other participant in a thread
    const getOtherParticipant = (thread: MessageThread): User | null => {
        const participant = thread.participants.find(p => p.user.id !== CURRENT_USER_ID);
        return participant ? participant.user : null;
    }

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
                <h2 className="text-lg font-semibold text-text-primary mb-3">Online nu</h2>
                <div className="flex space-x-4">
                    {onlineUsers.map(user => (
                        <div key={user.id} className="flex flex-col items-center">
                            <div className="relative">
                                <img src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full" />
                                <span className="absolute bottom-0 right-0 block h-4 w-4 rounded-full bg-green-500 border-2 border-white"></span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 flex-1">
                <h2 className="text-lg font-semibold text-text-primary mb-3">Alle beskeder</h2>
                <div className="space-y-2">
                    {threads.map(thread => {
                        const otherUser = getOtherParticipant(thread);
                        if (!otherUser) return null;

                        return (
                            <Link to={`/chat/${thread.id}`} key={thread.id} className="flex items-center p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                                <img src={otherUser.avatar_url} alt={otherUser.name} className="w-14 h-14 rounded-full mr-4" />
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-bold text-text-primary">{otherUser.name}</p>
                                    <p className="text-sm text-text-secondary truncate">{thread.last_message}</p>
                                </div>
                                <div className="text-right ml-2 flex-shrink-0">
                                    <p className="text-xs text-gray-400 mb-1">{thread.timestamp}</p>
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