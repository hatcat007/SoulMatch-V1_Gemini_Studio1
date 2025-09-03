import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Shield, Plus, Ticket, BrainCircuit, MoreVertical, Smile, Check } from 'lucide-react';
import type { Message, MessageThread, User, Friendship } from '../types';
import { supabase } from '../services/supabase';
import { getAiClient } from '../services/geminiService';
import type { Chat } from "@google/genai";
import ReportUserModal from '../components/ReportUserModal';
import { fetchPrivateFile } from '../services/s3Service';

const PrivateImage: React.FC<{src: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');

    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            fetchPrivateFile(src).then(url => {
                objectUrl = url;
                setImageUrl(url);
            });
        }
        return () => {
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    if (!imageUrl) return <div className={`${className} bg-gray-200 animate-pulse rounded-xl`} />;
    return <img src={imageUrl} alt={alt} className={className} />;
};

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

type FriendshipStatus = 'not_friends' | 'pending_them' | 'pending_me' | 'friends' | 'loading';
type EmojiLevel = 'ai' | 'none' | 'some' | 'many';

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const formatText = (inputText: string) => {
        // Replace **text** with <strong>text</strong>
        let formatted = inputText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Replace *text* with <em>text</em>
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Handle list items starting with - or *
        formatted = formatted.replace(/^\s*[-*]\s+(.*)/gm, '<li class="ml-4 list-disc">$1</li>');
        // Wrap consecutive list items in a <ul>
        formatted = formatted.replace(/(<li.*?>.*?<\/li>)+/gs, '<ul>$&</ul>');
        // Replace newlines with <br> for paragraph breaks, but not inside lists
        formatted = formatted.replace(/<\/ul>\n/g, '</ul><br/>').replace(/\n/g, '<br />');
        return formatted;
    };

    return <div dangerouslySetInnerHTML={{ __html: formatText(text) }} className="break-words whitespace-pre-wrap leading-relaxed" />;
};


const ChatPage: React.FC = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const optionsMenuRef = useRef<HTMLDivElement>(null);
    const emojiMenuRef = useRef<HTMLDivElement>(null);
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [thread, setThread] = useState<MessageThread | null>(null);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('loading');
    const [aiChat, setAiChat] = useState<Chat | null>(null);
    const [isAiReplying, setIsAiReplying] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [isEmojiMenuOpen, setIsEmojiMenuOpen] = useState(false);
    const [emojiLevel, setEmojiLevel] = useState<EmojiLevel>('ai');


    const isAiMentorChat = chatId === 'ai-mentor';
    const meetingTimeText = useMemo(() => formatMeetingTime(thread?.match_timestamp), [thread]);
    
    useEffect(() => {
        const setupAiChat = () => {
            let emojiInstruction = '';
            switch (emojiLevel) {
                case 'none':
                    emojiInstruction = 'Do not use any emojis in your response.';
                    break;
                case 'some':
                    emojiInstruction = 'Use a few emojis where appropriate to seem friendly.';
                    break;
                case 'many':
                    emojiInstruction = 'Use emojis generously to make the conversation lively and expressive.';
                    break;
                case 'ai':
                default:
                    emojiInstruction = 'You can use emojis if you feel it enhances the message.';
                    break;
            }

            const systemInstruction = `You are "SoulMatch AI mentor", a friendly and supportive assistant for the SoulMatch app. Your goal is to help users combat loneliness by improving their social interactions. You can offer conversation starters, give advice when a conversation stalls, suggest appropriate replies, and provide support. Provide helpful, kind, and actionable advice. Keep responses concise and easy to read on a mobile device. Always respond in Danish. Format your responses in simple markdown (e.g., **bold**, *italics*, and lists starting with a hyphen). ${emojiInstruction}`;

            const ai = getAiClient();
            const chat = ai.chats.create({
              model: 'gemini-2.5-flash',
              config: { systemInstruction },
            });
            setAiChat(chat);
        };

        if (isAiMentorChat) {
            setupAiChat();
        }
    }, [emojiLevel, isAiMentorChat]);
    
    useEffect(() => {
        const fetchInitialData = async () => {
             const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) { navigate('/login'); return; }
            const { data: userProfile } = await supabase.from('users').select('*').eq('auth_id', authUser.id).single();
            setCurrentUser(userProfile);
        };
        
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

                if (other) {
                    const u1 = Math.min(userProfile.id, other.id);
                    const u2 = Math.max(userProfile.id, other.id);
                    const { data: friendshipData } = await supabase.from('friends').select('*').eq('user_id_1', u1).eq('user_id_2', u2).single();
                    if (friendshipData) {
                        if (friendshipData.status === 'accepted') setFriendshipStatus('friends');
                        else if (friendshipData.status === 'pending') {
                            setFriendshipStatus(friendshipData.action_user_id === userProfile.id ? 'pending_me' : 'pending_them');
                        }
                    } else {
                        setFriendshipStatus('not_friends');
                    }
                }

                const { data: messagesData } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('thread_id', chatId)
                    .order('created_at', { ascending: true });
                
                if (messagesData) setMessages(messagesData as Message[]);
            }
            setLoading(false);
        };
        
        if (isAiMentorChat) {
            fetchInitialData().then(() => {
                const aiUser: User = {
                    id: -1, name: 'SoulMatch AI mentor', age: 0,
                    avatar_url: 'https://q1f3.c3.e2-9.dev/soulmatch-uploads-public/bot.png',
                    online: true,
                };
                setOtherUser(aiUser);
                 setMessages([{
                    id: 'welcome-1', text: 'Hej! Jeg er din personlige AI mentor. Hvordan kan jeg hjælpe dig i dag? Du kan spørge mig om alt fra samtaleemner til råd, hvis en samtale er gået i stå.',
                    created_at: new Date().toISOString(), sender_id: -1, thread_id: 'ai-mentor'
                }]);
                setLoading(false);
            });
        } else {
            fetchChatData();
        }
    }, [chatId, navigate, isAiMentorChat]);

    useEffect(() => {
        if (isAiMentorChat || !chatId) return;
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
    }, [chatId, isAiMentorChat]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setIsOptionsMenuOpen(false);
            }
            if (emojiMenuRef.current && !emojiMenuRef.current.contains(event.target as Node)) {
                setIsEmojiMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages.length, isAiReplying]);
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !currentUser) return;
        
        if (isAiMentorChat) {
             if (!aiChat) return;
            const userMessage: Message = {
                id: Date.now(),
                text: newMessage,
                created_at: new Date().toISOString(),
                sender_id: currentUser.id,
                thread_id: 'ai-mentor'
            };
            setMessages(prev => [...prev, userMessage]);
            setNewMessage('');
            setIsAiReplying(true);

            try {
                const response = await aiChat.sendMessage({ message: newMessage });
                const aiResponse: Message = {
                    id: Date.now() + 1,
                    text: response.text,
                    created_at: new Date().toISOString(),
                    sender_id: -1, // AI Sender ID
                    thread_id: 'ai-mentor'
                };
                setMessages(prev => [...prev, aiResponse]);
            } catch (error) {
                 console.error("Error getting AI response:", error);
                 const errorResponse: Message = {
                    id: Date.now() + 1,
                    text: "Beklager, der opstod en fejl. Prøv venligst igen.",
                    created_at: new Date().toISOString(),
                    sender_id: -1,
                    thread_id: 'ai-mentor'
                };
                setMessages(prev => [...prev, errorResponse]);
            } finally {
                setIsAiReplying(false);
            }
        } else {
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
        }
    };
    
    const handleSendFriendRequest = async () => {
        if (!currentUser || !otherUser || friendshipStatus !== 'not_friends') return;
        setFriendshipStatus('loading');
        
        const u1 = Math.min(currentUser.id, otherUser.id);
        const u2 = Math.max(currentUser.id, otherUser.id);
        
        const { error } = await supabase.from('friends').insert({
            user_id_1: u1,
            user_id_2: u2,
            action_user_id: currentUser.id,
            status: 'pending'
        });
        
        if (error) {
            console.error("Error sending friend request:", error);
            setFriendshipStatus('not_friends');
        } else {
            setFriendshipStatus('pending_me');
        }
    };

    const renderFriendButton = () => {
        const baseClasses = "font-bold py-2 px-4 rounded-full text-sm transition-colors";
        switch(friendshipStatus) {
            case 'not_friends':
                return <button onClick={handleSendFriendRequest} className={`bg-primary text-white ${baseClasses} hover:bg-primary-dark`}>Tilføj ven</button>;
            case 'pending_me':
                return <button disabled className={`bg-gray-200 text-gray-500 ${baseClasses} cursor-not-allowed`}>Anmodning sendt</button>;
            case 'pending_them':
                return <button disabled className={`bg-gray-200 text-gray-500 ${baseClasses} cursor-not-allowed`}>Anmodning modtaget</button>;
            case 'friends':
                return <button disabled className={`bg-green-100 text-green-700 ${baseClasses} cursor-not-allowed`}>Venner</button>;
            case 'loading':
                 return <button disabled className={`bg-gray-200 text-gray-500 ${baseClasses} cursor-wait`}>...</button>;
            default:
                return <div className="w-24 h-8" />;
        }
    };

    const renderHeaderActions = () => {
        if (isAiMentorChat) return null;
        return (
            <div className="flex items-center space-x-1">
                {renderFriendButton()}
                <div className="relative" ref={optionsMenuRef}>
                    <button 
                        onClick={() => setIsOptionsMenuOpen(prev => !prev)} 
                        className="p-2 text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-surface-light rounded-full"
                        aria-label="Flere valg"
                    >
                        <MoreVertical size={24} />
                    </button>
                    {isOptionsMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface rounded-lg shadow-xl z-20 border border-gray-100 dark:border-dark-border">
                            <button
                                onClick={() => {
                                    setIsReportModalOpen(true);
                                    setIsOptionsMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 font-semibold"
                            >
                                Anmeld {otherUser?.name}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="p-4 text-center">Loading chat...</div>;
    }
    
    if (!currentUser || !otherUser) {
        return (
            <div className="p-4 text-center">
                <p>Chat not found.</p>
                <button onClick={() => navigate('/chat')} className="text-primary mt-4">Back to chats</button>
            </div>
        );
    }
    
    const getMessageTimestamp = (msg: Message) => new Date(msg.created_at).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });

    const emojiMenuOptions: { level: EmojiLevel; label: string }[] = [
        { level: 'ai', label: 'Lad AI beslutte' },
        { level: 'none', label: 'Ingen emojis' },
        { level: 'some', label: 'En smule emojis' },
        { level: 'many', label: 'Mange emojis' },
    ];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface">
            <header className="flex items-center p-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
                    <ArrowLeft size={28} />
                </button>
                <div className="flex-1 text-center">
                    <h2 className="font-bold text-lg text-text-primary dark:text-dark-text-primary flex items-center justify-center">
                        {otherUser.name}
                        {isAiMentorChat ? <BrainCircuit className="w-5 h-5 ml-1 text-accent" strokeWidth={2.5}/> : <Shield className="w-5 h-5 ml-1 text-blue-500" strokeWidth={2.5} />}
                    </h2>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{otherUser.online ? 'Online' : 'Offline'}</p>
                    {!isAiMentorChat && meetingTimeText && (
                        <p className="text-xs text-text-secondary dark:text-dark-text-secondary font-semibold mt-1">{meetingTimeText}</p>
                    )}
                </div>
                <div className="min-w-[140px] flex justify-end">
                    {renderHeaderActions()}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:px-8 lg:px-16 space-y-4">
                {messages.map((msg) => {
                    const isCurrentUser = msg.sender_id === currentUser.id;
                    const isAi = msg.sender_id === -1;
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
                                    <PrivateImage src={msg.image_url} alt="Chat content" className="rounded-xl m-1" />
                                )}
                                <div className="flex items-end space-x-2 px-3 py-2">
                                    {msg.text && (isAi ? <MarkdownRenderer text={msg.text} /> : <p className="break-words whitespace-pre-wrap">{msg.text}</p>)}
                                    <p className={`text-xs whitespace-nowrap self-end ${isCurrentUser ? 'text-gray-200' : 'text-gray-500 dark:text-dark-text-secondary'}`}>{getMessageTimestamp(msg)}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {isAiReplying && (
                    <div className="flex justify-start">
                        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-dark-surface-light text-gray-800 dark:text-dark-text-primary rounded-t-2xl rounded-br-2xl px-3 py-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-0"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div>
                        </div>
                    </div>
                )}
                 <div ref={messagesEndRef} />
            </main>

            <footer className="p-3 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2 max-w-3xl mx-auto">
                    <div className="flex items-center w-full p-1 border border-gray-300 dark:border-dark-border rounded-full">
                        {isAiMentorChat ? (
                           <div className="relative" ref={emojiMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsEmojiMenuOpen(prev => !prev)}
                                    className="p-2 text-primary hover:bg-primary-light dark:hover:bg-primary/20 rounded-full"
                                    aria-label="Change emoji level"
                                >
                                    <Smile size={24} />
                                </button>
                                {isEmojiMenuOpen && (
                                    <div className="absolute bottom-full mb-2 w-48 bg-white dark:bg-dark-surface-light rounded-lg shadow-lg border border-gray-100 dark:border-dark-border">
                                        {emojiMenuOptions.map(option => (
                                            <button
                                                key={option.level}
                                                type="button"
                                                onClick={() => { setEmojiLevel(option.level); setIsEmojiMenuOpen(false); }}
                                                className="w-full text-left px-3 py-2 text-sm flex items-center justify-between font-medium text-text-primary dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-dark-border"
                                            >
                                                {option.label}
                                                {emojiLevel === option.level && <Check size={16} className="text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                           </div>
                        ) : (
                            <button type="button" className="p-2 text-primary hover:bg-primary-light dark:hover:bg-primary/20 rounded-full" aria-label="Add content">
                                <Plus size={24} />
                            </button>
                        )}
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
                            disabled={!newMessage.trim() || isAiReplying}
                            aria-label="Send message"
                        >
                            <Send size={24} />
                        </button>
                    </div>
                </form>
            </footer>
            {currentUser && otherUser && (
                <ReportUserModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    reporterUser={currentUser}
                    reportedUser={otherUser}
                />
            )}
        </div>
    );
};

export default ChatPage;