import React, { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Message, User, MessageThread } from '../types';
import { ArrowLeft, Send, Paperclip, Loader2, MoreVertical } from 'lucide-react';
import { fetchPrivateFile, uploadFile } from '../services/s3Service';
import LoadingScreen from '../components/LoadingScreen';
import MeetingTimer from '../components/MeetingTimer';
import ReportUserModal from '../components/ReportUserModal';
// FIX: Corrected import to align with the new App.tsx structure which provides the chat cache.
import { useChatCache } from '../App';

// Component for securely displaying images within chat bubbles.
const ChatMessageImage: React.FC<{src: string, alt: string}> = ({ src, alt }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            setLoading(true);
            fetchPrivateFile(src).then(url => {
                objectUrl = url;
                setImageUrl(url);
            }).finally(() => {
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
        return () => { if (objectUrl && objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl); };
    }, [src]);

    if (loading) {
        return <div className="w-56 h-40 bg-gray-200 dark:bg-dark-surface-light rounded-lg animate-pulse" />;
    }
    
    if (!imageUrl) return null;

    return <img src={imageUrl} alt={alt} className="max-w-[250px] max-h-[300px] w-auto h-auto object-cover rounded-lg cursor-pointer" />;
};


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
    
    const { cache, setInitialChatData, addMessageToCache, isChatCached } = useChatCache();
    const cachedData = chatId ? cache[chatId] : null;

    const [messages, setMessages] = useState<Message[]>([]);
    const [thread, setThread] = useState<MessageThread | null>(null);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        if (cachedData) {
            setThread(cachedData.thread);
            setMessages(cachedData.messages);
            const other = cachedData.thread.participants.find((p: any) => p.user.id !== currentUser?.id)?.user;
            setOtherUser(other || null);
        }
    }, [cachedData, currentUser]);
    
    // FIX: currentUserId should always be currentUser.id.
    // For organizations, useAuth() correctly sets currentUser to the host's user profile.
    const currentUserId = currentUser?.id;

    useEffect(() => {
        const fetchData = async () => {
            if (!chatId || !currentUserId) {
                setLoading(false);
                return;
            }

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

            if (!isChatCached(chatId)) {
                setLoading(true);

                if (organization) {
                    // Organization flow: use secure RPC function
                    const { data: threadData, error: rpcError } = await supabase.rpc('get_organization_chat_thread_details', { p_thread_id: Number(chatId) });

                    if (rpcError || !threadData) {
                        console.error('Error fetching org thread details via RPC:', rpcError?.message);
                        setLoading(false);
                        return;
                    }

                    const { data: messagesData } = await supabase.from('messages').select('*').eq('thread_id', chatId).order('created_at', { ascending: true });
                    setInitialChatData(chatId, threadData as any, messagesData || []);
                } else {
                    // Regular user flow: use RLS-protected select
                    const threadPromise = supabase
                        .from('message_threads')
                        .select('*, event:events(*), participants:message_thread_participants(user:users(*))')
                        .eq('id', chatId)
                        .single();

                    const messagesPromise = supabase
                        .from('messages')
                        .select('*')
                        .eq('thread_id', chatId)
                        .order('created_at', { ascending: true });
                    
                    const [threadRes, messagesRes] = await Promise.all([threadPromise, messagesPromise]);
                    
                    if (threadRes.error || !threadRes.data) {
                        console.error('Error fetching thread:', threadRes.error?.message);
                        setLoading(false);
                        return;
                    }
                    setInitialChatData(chatId, threadRes.data as any, messagesRes.data || []);
                }
            }
            
            setLoading(false);
        };

        fetchData();
    }, [chatId, currentUserId, isChatCached, setInitialChatData, organization]);

    useEffect(() => {
        if (!chatId || chatId === 'ai-mentor' || !currentUserId) return;

        const channel = supabase.channel(`messages:${chatId}`)
            .on<Message>(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${chatId}` },
                (payload) => {
                     addMessageToCache(chatId, payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chatId, currentUserId, addMessageToCache]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUserId || isSending) return;
        if (!chatId || chatId === 'ai-mentor') {
            alert("AI chat is not implemented yet.");
            return;
        }
        
        setIsSending(true);
        const text = newMessage.trim();
        setNewMessage('');
        
        const { data: newMessageData, error } = await supabase.from('messages').insert({
            thread_id: chatId,
            sender_id: currentUserId,
            text: text,
        }).select().single();
        
        if (error) {
            console.error("Error sending message:", error);
            setNewMessage(text);
        } else if (newMessageData) {
            // Realtime subscription will handle adding the message to cache
        }
        setIsSending(false);
    };

    const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !currentUserId || !chatId || chatId === 'ai-mentor') return;
    
        const file = e.target.files[0];
        setIsUploading(true);
    
        try {
            const imageUrl = await uploadFile(file);
            
            const { error } = await supabase.from('messages').insert({
                thread_id: chatId,
                sender_id: currentUserId,
                text: '',
                image_url: imageUrl,
            });
    
            if (error) {
                console.error("Error sending image message:", error);
            }
        } catch (uploadError) {
            console.error("Error uploading file:", uploadError);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
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

    // FIX: Identify host users by their bio instead of a fragile name map.
    let displayName = otherUser?.name;
    if (otherUser?.bio?.startsWith('Kontaktperson for ')) {
        displayName = `${otherUser.name} fra ${otherUser.bio.replace('Kontaktperson for ', '')}`;
    }
    
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
                             <div className={`rounded-2xl ${isCurrentUser ? 'bg-primary text-white rounded-br-none' : 'bg-white dark:bg-dark-surface shadow-sm rounded-bl-none'} ${message.image_url ? 'p-1.5' : 'p-3'}`}>
                                {message.image_url ? (
                                    <ChatMessageImage src={message.image_url} alt="Sent image" />
                                ) : (
                                    <>
                                        <p className="text-sm break-words">{message.text}</p>
                                        <MessageCard card={message.card_data} />
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            <footer className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky bottom-0">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2">
                    <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" disabled={isUploading} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 text-gray-500 hover:text-primary disabled:opacity-50">
                        <Paperclip size={22} />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Skriv en besked..."
                        disabled={isUploading}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-dark-surface-light border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                    <button type="submit" disabled={isSending || !newMessage.trim() || isUploading} className="p-3 bg-primary text-white rounded-full disabled:opacity-50">
                        {isUploading || isSending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} />}
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default ChatPage;