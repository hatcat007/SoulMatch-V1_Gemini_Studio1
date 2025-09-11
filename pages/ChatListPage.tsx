import React, { useState, useEffect, useMemo } from 'react';
import { Search, Lock, Loader2, Image as ImageIcon, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MessageThread, User } from '../types';
import NotificationIcon from '../components/NotificationIcon';
import { supabase } from '../services/supabase';
import { fetchPrivateFile } from '../services/s3Service';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            setLoading(true);
            fetchPrivateFile(src).then(url => {
                objectUrl = url;
                setImageUrl(url);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }

        return () => {
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    if(loading) {
        return <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light`}><Loader2 className="animate-spin text-gray-400" size={20}/></div>;
    }
    if(!imageUrl) {
        return <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light`}><ImageIcon className="text-gray-400" size={20}/></div>;
    }

    return <img src={imageUrl} alt={alt} className={className} />;
};

const ChatListPage: React.FC = () => {
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const [threads, setThreads] = useState<MessageThread[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser, loading: authLoading } = useAuth();

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
            if (!currentUser) {
                if (!authLoading) setLoading(false);
                return;
            }

            setLoading(true); // Start loading chat data
            const userId = currentUser.id;
            
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
                console.error('Error fetching thread participants:', tpError.message);
                setLoading(false);
                return;
            }

            const threadIds = threadParticipants.map(p => p.thread_id);
            if (threadIds.length > 0) {
                const { data: threadsData, error: threadsError } = await supabase
                    .from('message_threads')
                    .select(`
                        *,
                        event:events(id, title),
                        participants:message_thread_participants (
                            user:users (*)
                        )
                    `)
                    .in('id', threadIds)
                    .order('timestamp', { ascending: false });
                
                if (threadsError) {
                    console.error('Error fetching message threads:', threadsError);
                } else {
                    setThreads(threadsData as any || []);
                }
            }
            setLoading(false);
        };

        fetchData();
    }, [currentUser, authLoading]);
    
    const { privateChats, eventChats } = useMemo(() => {
        const eventChats = threads.filter(t => t.is_event_chat);
        const privateChats = threads.filter(t => !t.is_event_chat);
        return { privateChats, eventChats };
    }, [threads]);


    if (authLoading || loading) {
        return <LoadingScreen message="Indlæser chats..." />;
    }
    
    const getOtherParticipant = (thread: MessageThread): User | null => {
        if (thread.id === 'ai-mentor') return thread.participants[0].user;
        const participant = thread.participants.find(p => p.user?.id && p.user.id !== currentUser?.id);
        return participant?.user || null;
    }

    const allPrivateThreads = [aiMentorThread, ...privateChats];

    return (
        <div className="p-4 flex flex-col h-full bg-background dark:bg-dark-background">
            <div className="flex justify-between items-center mb-4">
                <div className="w-10"></div> {/* Spacer */}
                <h1 className="text-3xl font-bold text-primary">SoulMatch</h1>
                <NotificationIcon />
            </div>
            <div className="relative mb-6">
                <input
                    type="text"
                    placeholder="Søg i chat"
                    className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-full py-3 pl-10 pr-4 text-gray-700 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            
            <div className="flex items-center justify-center text-xs text-text-secondary dark:text-dark-text-secondary text-center mb-6 px-4">
                <Lock size={12} className="mr-1.5 flex-shrink-0" />
                <span>Beskeder er beskyttet med end-to-end-kryptering. Det er kun personer i denne chat, der kan læse, lytte til eller dele dem.</span>
            </div>

            <div className="flex-1 overflow-y-auto">
                {eventChats.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-3">Event Chats</h2>
                        <div className="space-y-2">
                             {eventChats.map(thread => {
                                const formattedTimestamp = thread.timestamp ? new Date(thread.timestamp).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }) : '';
                                return (
                                     <Link to={`/chat/${thread.id}`} key={thread.id} className="flex items-center p-3 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface-light transition-colors duration-200">
                                        <div className="w-14 h-14 rounded-full mr-4 bg-primary-light flex items-center justify-center"><Calendar className="w-7 h-7 text-primary"/></div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-bold text-text-primary dark:text-dark-text-primary">{thread.event?.title || 'Event Chat'}</p>
                                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary truncate">{thread.last_message}</p>
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
                                )
                            })}
                        </div>
                    </div>
                )}


                <div>
                    <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-3">Alle beskeder</h2>
                    <div className="space-y-2">
                        {allPrivateThreads.map(thread => {
                            const otherUser = getOtherParticipant(thread);
                            if (!otherUser) return null;

                            const formattedTimestamp = thread.timestamp ? new Date(thread.timestamp).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }) : '';
                            
                            // FIX: Identify host users by their bio instead of a fragile name map.
                            // This is more reliable and avoids incorrect labeling if a regular user has the same name as a host.
                            let displayName = otherUser.name;
                            if (otherUser.bio?.startsWith('Kontaktperson for ')) {
                                displayName = `${otherUser.name} fra ${otherUser.bio.replace('Kontaktperson for ', '')}`;
                            }


                            return (
                                <Link to={`/chat/${thread.id}`} key={thread.id} className="flex items-center p-3 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface-light transition-colors duration-200">
                                    <PrivateImage src={otherUser.avatar_url} alt={otherUser.name} className="w-14 h-14 rounded-full mr-4 object-cover" />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-bold text-text-primary dark:text-dark-text-primary">{displayName}</p>
                                        <p className="text-sm text-text-secondary dark:text-dark-text-secondary truncate">{thread.last_message}</p>
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
        </div>
    );
};

export default ChatListPage;