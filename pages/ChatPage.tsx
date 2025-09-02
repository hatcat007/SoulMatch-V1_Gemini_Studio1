import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Shield, Plus, Ticket } from 'lucide-react';
import type { Message, MessageThread, User } from '../types';
import { supabase } from '../services/supabase';

const formatMeetingTime = (matchTimestamp?: string): string | null => {
    if (!matchTimestamp) return null;

    const totalDuration = 3 * 24 * 60 * 60 * 1000; // 3 days in ms
    const deadline = new Date(matchTimestamp).getTime() + totalDuration;
    const difference = deadline - Date.now();

    if (difference <= 0) return "Tiden for møde er udløbet";
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `Møde om ${days} ${days === 1 ? 'dag' : 'dage'}`;
    if (hours > 0) return `Møde om ${hours} ${hours === 1 ? 'time' : 'timer'}`;
    if (minutes > 0) return `Møde om ${minutes} ${minutes === 1 ? 'minut' : 'minutter'}`;
    return `Møde om et øjeblik`;
};

const ChatPage: React.FC = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [thread, setThread] = useState<MessageThread | null>(null);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const meetingTimeText = useMemo(() => formatMeetingTime(thread?.match_timestamp), [thread]);
    
    useEffect(() => {
        const fetchChatData = async () => {
            if (!chatId) return;
            setLoading(true);

            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) { setLoading(false); navigate('/login'); return; }

            const { data: userProfile } = await supabase.from('users').select('*').eq('auth_id', authUser.id).single();
            if (!userProfile) { setLoading(false); return; }
            setCurrentUser(userProfile);

            const { data: threadData } = await supabase
                .from('message_threads')
                .select('*, participants:message_thread_participants(user:users(*))')
                .eq('id', chatId)
                .single();
            
            if (threadData) {
                setThread(threadData as any);
                const other = threadData.participants.find(p => p.user.id !== userProfile.id)?.user;
                setOtherUser(other || null);

                const { data: messagesData } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('thread_id', chatId)
                    .order('created_at', { ascending: true });
                
                if (messagesData) setMessages(messagesData as Message[]);
            }
            setLoading(false);
        };
        fetchChatData();
    }, [chatId, navigate]);

    useEffect(() => {
        if (!chatId) return;
        const channel = supabase.channel(`chat:${chatId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages', 
                filter: `thread_id=eq.${chatId}` 
            },
            (payload) => {
                setMessages(currentMessages => [...currentMessages, payload.new as Message]);
            }
        ).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [chatId]);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages.length]);

    if (loading) {
        return <div className="p-4 text-center">Loading chat...</div>;
    }
    
    if (!thread || !currentUser || !otherUser) {
        return (
            <div className="p-4 text-center">
                <p>Chat not found.</p>
                <button onClick={() => navigate('/chat')} className="text-primary mt-4">Back to chats</button>
            </div>
        );
    }
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;

        const { error } = await supabase.from('messages').insert({
            thread_id: Number(chatId),
            sender_id: currentUser.id,
            text: newMessage,
        });

        if (error) {
            console.error('Error sending message:', error);
        } else {
            setNewMessage('');
        }
    };
    
    const getMessageTimestamp = (msg: Message) => new Date(msg.created_at).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface">
            <header className="flex items-center p-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
                    <ArrowLeft size={28} />
                </button>
                <div className="flex-1 text-center">
                    <h2 className="font-bold text-lg text-text-primary dark:text-dark-text-primary flex items-center justify-center">
                        {otherUser.name}
                        <Shield className="w-5 h-5 ml-1 text-blue-500" strokeWidth={2.5} />
                    </h2>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{otherUser.online ? 'Online' : 'Offline'}</p>
                    {meetingTimeText && (
                        <p className="text-xs text-text-secondary dark:text-dark-text-secondary font-semibold mt-1">{meetingTimeText}</p>
                    )}
                </div>
                <button className="bg-primary text-white font-bold py-2 px-4 rounded-full text-sm hover:bg-primary-dark transition-colors">
                    Tilføj ven
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:px-8 lg:px-16 space-y-4">
                {messages.map((msg) => {
                    const isCurrentUser = msg.sender_id === currentUser.id;
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`flex flex-col max-w-[80%] ${
                                    isCurrentUser
                                        ? 'bg-primary text-white rounded-t-2xl rounded-bl-2xl'
                                        : 'bg-gray-100 dark:bg-dark-surface-light text-gray-800 dark:text-dark-text-primary rounded-t-2xl rounded-br-2xl'
                                }`}
                            >
                                {msg.image_url && (
                                    <img src={msg.image_url} alt="Chat content" className="rounded-xl m-1" />
                                )}
                                <div className="flex items-end space-x-2 px-3 py-2">
                                    {msg.text && <p className="break-words">{msg.text}</p>}
                                    <p className={`text-xs whitespace-nowrap self-end ${isCurrentUser ? 'text-gray-200' : 'text-gray-500 dark:text-dark-text-secondary'}`}>{getMessageTimestamp(msg)}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                 <div ref={messagesEndRef} />
            </main>

            <footer className="p-3 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2 max-w-3xl mx-auto">
                    <div className="flex items-center w-full p-1 border border-gray-300 dark:border-dark-border rounded-full">
                         <button type="button" className="p-2 text-primary hover:bg-primary-light dark:hover:bg-primary/20 rounded-full" aria-label="Add content">
                            <Plus size={24} />
                        </button>
                        <button type="button" className="p-2 text-primary hover:bg-primary-light dark:hover:bg-primary/20 rounded-full" aria-label="Add ticket">
                            <Ticket size={24} />
                        </button>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Send en besked"
                            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-700 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-secondary px-2"
                            aria-label="Chat message input"
                        />
                         <button
                            type="submit"
                            className="text-primary rounded-full p-2 flex-shrink-0 hover:bg-primary-light dark:hover:bg-primary/20 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!newMessage.trim()}
                            aria-label="Send message"
                        >
                            <Send size={24} />
                        </button>
                    </div>
                </form>
            </footer>
        </div>
    );
};

export default ChatPage;
