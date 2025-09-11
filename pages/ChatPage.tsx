import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Message, User, MessageThread } from '../types';
import { ArrowLeft, Send, Paperclip, Loader2, MoreVertical } from 'lucide-react';
import { fetchPrivateFile } from '../services/s3Service';
import LoadingScreen from '../components/LoadingScreen';
import MeetingTimer from '../components/MeetingTimer';
import ReportUserModal from '../components/ReportUserModal';

// Simplified PrivateImage component for chat
const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            fetchPrivateFile(src).then(url => {
                objectUrl = url;
                setImageUrl(url);
            });
        }
        return () => { if (objectUrl && objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl); };
    }, [src]);

    if (!imageUrl) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light animate-pulse`} />;
    return <img src={imageUrl} alt={alt} className={className} />;
};

const ChatPage: React.FC = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const { user: currentUser, organization } = useAuth();

    const [messages, setMessages] = useState<Message[]>([]);
    const [thread, setThread] = useState<MessageThread | null>(null);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [hostMap, setHostMap] = useState<Map<string, string>>(new Map());
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const isOrgChat = !!organization;
    const currentUserId = currentUser?.id;

    const fetchThreadData = useCallback(async () => {
        if (!chatId || !currentUserId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // AI Mentor special case
        if (chatId === 'ai-mentor') {
            const aiMentorThread: MessageThread = {
                id: 'ai-mentor',
                last_message: 'Din personlige AI mentor til samtaler.',
                timestamp: new Date().toISOString(),
                unread_count: 0,
                participants: [{ user: {
                    id: -1, name: 'SoulMatch AI mentor', age: 0,
                    avatar_url: 'https://q1f3.c3.e2-9.dev/soulmatch-uploads-public/bot.png',
                    online: true,
                }}]
            };
            setThread(aiMentorThread);
            setOtherUser(aiMentorThread.participants[0].user);
            setMessages([]);
            setLoading(false);
            return;
        }
        
        const orgsPromise = supabase.from('organizations').select('name, host_name');

        const threadPromise = supabase
            .from('message_threads')
            .select('*, event:events(*), participants:message_thread_participants(user:users(*))')
            .eq('id', chatId)
            .single();

        const [orgsRes, threadRes] = await Promise.all([orgsPromise, threadPromise]);

        if (orgsRes.error) {
            console.error('Error fetching organizations for host mapping:', orgsRes.error);
        } else if (orgsRes.data) {
            const newHostMap = new Map<string, string>();
            orgsRes.data.forEach(org => {
                if (org.host_name && org.name) {
                    newHostMap.set(org.host_name, org.name);
                }
            });
            setHostMap(newHostMap);
        }

        const { data: threadData, error: threadError } = threadRes;

        if (threadError || !threadData) {
            console.error('Error fetching thread:', threadError?.message);
            setLoading(false);
            return;
        }

        setThread(threadData as any);
        const other = threadData.participants.find((p: any) => p.user.id !== currentUserId)?.user;
        setOtherUser(other || null);

        const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('thread_id', chatId)
            .order('created_at', { ascending: true });

        if (messagesError) {
            console.error('Error fetching messages:', messagesError.message);
        } else {
            setMessages(messagesData || []);
        }

        setLoading(false);
    }, [chatId, currentUserId]);

    useEffect(() => {
        fetchThreadData();
    }, [fetchThreadData]);

    useEffect(() => {
        if (!chatId || chatId === 'ai-mentor' || !currentUserId) return;

        const channel = supabase.channel(`messages:${chatId}`)
            .on<Message>(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${chatId},sender_id=neq.${currentUserId}` },
                (payload) => {
                    setMessages(prev => [...prev, payload.new]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chatId, currentUserId]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUserId || isSending) return;
        if (!chatId || chatId === 'ai-mentor') {
            alert("AI chat is not implemented yet.");
            return;
        }
        
        setIsSending(true);
        const tempId = `temp_${Date.now()}`;
        const messagePayload: Partial<Message> = {
            id: tempId,
            thread_id: chatId,
            sender_id: currentUserId,
            text: newMessage.trim(),
            created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, messagePayload as Message]);
        setNewMessage('');
        
        const { error } = await supabase.from('messages').insert({
            thread_id: chatId,
            sender_id: currentUserId,
            text: messagePayload.text,
        });
        
        setIsSending(false);
        if (error) {
            console.error("Error sending message:", error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(messagePayload.text ?? '');
        }
    };
    
    const MessageCard: React.FC<{ card: Message['card_data'] }> = ({ card }) => {
        if (!card) return null;
        const linkTo = `/${card.type}/${card.id}`;
        return (
            <Link to={linkTo} className="block mt-2 bg-gray-100 dark:bg-dark-surface-light rounded-lg overflow-hidden max-w-xs cursor-pointer hover:shadow-md transition">
                {card.image_url && <PrivateImage src={card.image_url} alt={card.title} className="w-full h-24 object-cover" />}
                <div className="p-2">
                    <p className="font-bold text-sm line-clamp-1">{card.title}</p>
                    {card.address && <p className="text-xs text-gray-500 line-clamp-1">{card.address}</p>}
                    {card.offer && <p className="text-xs text-green-600 font-semibold">{card.offer}</p>}
                </div>
            </Link>
        )
    };
    
    if (loading) return <LoadingScreen message="Indlæser chat..." />;
    if (!thread) return <div className="p-4 text-center">Chat ikke fundet.</div>;

    const orgName = otherUser ? hostMap.get(otherUser.name) : undefined;
    const displayName = orgName ? `${otherUser?.name} fra ${orgName}` : otherUser?.name;
    const headerTitle = thread.is_event_chat ? thread.event?.title : displayName;
    const headerAvatar = thread.is_event_chat ? null : otherUser?.avatar_url;

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-dark-background">
             {currentUser && otherUser && <ReportUserModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} reporterUser={currentUser} reportedUser={otherUser} />}
            <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary rounded-full">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <div className="flex items-center">
                        {headerAvatar && <PrivateImage src={headerAvatar} alt={headerTitle || 'Avatar'} className="w-8 h-8 rounded-full mr-2" />}
                        <h1 className="text-lg font-bold text-text-primary dark:text-dark-text-primary">{headerTitle}</h1>
                    </div>
                </div>
                 <div className="relative">
                     <button onClick={() => setIsReportModalOpen(true)} className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary rounded-full">
                         <MoreVertical size={24} />
                     </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {thread?.match_timestamp && <MeetingTimer matchTimestamp={thread.match_timestamp} />}
                {messages.map((message) => {
                    const isCurrentUser = message.sender_id === currentUserId;
                    return (
                        <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${isCurrentUser ? 'bg-primary text-white rounded-br-none' : 'bg-white dark:bg-dark-surface shadow-sm rounded-bl-none'}`}>
                                <p className="text-sm break-words">{message.text}</p>
                                <MessageCard card={message.card_data} />
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            <footer className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky bottom-0">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2">
                    <button type="button" className="p-2 text-gray-500 hover:text-primary"><Paperclip size={22} /></button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Skriv en besked..."
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-dark-surface-light border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button type="submit" disabled={isSending || !newMessage.trim()} className="p-3 bg-primary text-white rounded-full disabled:opacity-50">
                        {isSending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} />}
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default ChatPage;