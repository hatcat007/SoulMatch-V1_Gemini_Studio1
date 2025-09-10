import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Plus, Ticket, BrainCircuit, MoreVertical, Smile, Check, MapPin, Lock, Users, Image as ImageIcon, Loader2, X } from 'lucide-react';
import type { Message, MessageThread, User, Friendship } from '../types';
import { supabase } from '../services/supabase';
import { getAiClient } from '../services/geminiService';
import type { Chat } from "@google/genai";
import ReportUserModal from '../components/ReportUserModal';
import { fetchPrivateFile, uploadFile } from '../services/s3Service';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import MeetingTimer from '../components/MeetingTimer';
import { motion, AnimatePresence } from 'framer-motion';

const PrivateImage: React.FC<{src?: string, alt: string, className: string, onClick?: () => void}> = ({ src, alt, className, onClick }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            setLoading(true);
            if (src.startsWith('blob:') || src.startsWith('data:')) {
                objectUrl = src;
                setImageUrl(src);
                setLoading(false);
            } else {
                fetchPrivateFile(src).then(url => {
                    objectUrl = url;
                    setImageUrl(url);
                    setLoading(false);
                });
            }
        } else {
            setLoading(false);
        }
        return () => {
            // Only revoke if it's a blob URL that this component created.
            // The logic in handleImageUpload handles revoking its own previews.
        };
    }, [src]);

    if (loading) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light animate-pulse`} />;
    if (!imageUrl) return <div className={`${className} bg-gray-100 dark:bg-dark-surface-light`} />;
    return <img src={imageUrl} alt={alt} className={className} onClick={onClick} />;
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

const CardMessage: React.FC<{ card: Message['card_data'], isCurrentUser: boolean }> = ({ card, isCurrentUser }) => {
    if (!card) return null;
    
    const linkTo = card.type === 'event' ? `/event/${card.id}` : `/places?open=${card.id}`;
    const cardBg = isCurrentUser ? 'bg-primary-dark/80 dark:bg-primary/50' : 'bg-white dark:bg-dark-surface';
    const textColor = isCurrentUser ? 'text-white' : 'text-text-primary dark:text-dark-text-primary';
    const secondaryTextColor = isCurrentUser ? 'text-gray-200' : 'text-text-secondary dark:text-dark-text-secondary';
    const offerTextColor = isCurrentUser ? 'text-yellow-300' : 'text-primary';

    return (
        <Link to={linkTo} className={`block mt-2 rounded-lg overflow-hidden border border-transparent hover:shadow-md transition-shadow ${cardBg}`}>
            {card.image_url && (
                <div className="h-32 bg-gray-100 dark:bg-dark-surface-light">
                    <PrivateImage src={card.image_url} alt={card.title} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="p-3">
                <h4 className={`font-bold ${textColor}`}>{card.title}</h4>
                {card.address && (
                    <p className={`text-xs ${secondaryTextColor} flex items-center mt-1`}>
                        <MapPin size={12} className="mr-1.5 flex-shrink-0" />
                        {card.address}
                    </p>
                )}
                {card.offer && (
                     <p className={`text-xs font-semibold ${offerTextColor} flex items-center mt-1`}>
                        <Ticket size={12} className="mr-1.5 flex-shrink-0" />
                        {card.offer}
                    </p>
                )}
                <p className={`text-xs font-semibold ${textColor} mt-2 opacity-80`}>Se detaljer →</p>
            </div>
        </Link>
    );
};

const ChatPage: React.FC = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const optionsMenuRef = useRef<HTMLDivElement>(null);
    const emojiMenuRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [thread, setThread] = useState<MessageThread | null>(null);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const { user: currentUser, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('loading');
    const [aiChat, setAiChat] = useState<Chat | null>(null);
    const [isAiReplying, setIsAiReplying] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [isEmojiMenuOpen, setIsEmojiMenuOpen] = useState(false);
    const [isOrgChat, setIsOrgChat] = useState(false);
    const [organizationName, setOrganizationName] = useState<string | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);


    const isAiMentorChat = chatId === 'ai-mentor';

    const emojiCategories = {
        'Smileys & Emotion': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁', '👅', '👄', '💋', '🩸'],
        'Food & Drink': ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽', '🥣', '🥡', '🥢', '🧂'],
        'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🪂', '🏋️‍♀️', '🏋️‍♂️', '🤼‍♀️', '🤼‍♂️', '🤸‍♀️', '🤸‍♂️', '🤺', '🤾‍♀️', '🤾‍♂️', '🏌️‍♀️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘‍♂️', '🏄‍♀️', '🏄‍♂️', '🏊‍♀️', '🏊‍♂️', '🤽‍♀️', '🤽‍♂️', '🚣‍♀️', '🚣‍♂️', '🧗‍♀️', '🧗‍♂️', '🚵‍♀️', '🚵‍♂️', '🚴‍♀️', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟', '🎪', '🤹‍♀️', '🤹‍♂️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟', '🎯', '🎳', '🎮', '🎰', '🧩'],
    };
    
    useEffect(() => {
        const fetchChatData = async () => {
            if (!chatId || !currentUser) return;
            setLoading(true);

            if (isAiMentorChat) {
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
                return;
            }

            const { data: threadData, error } = await supabase
                .from('message_threads')
                .select('*, event:events(id, title, time, end_time), participants:message_thread_participants(user:users(*))')
                .eq('id', chatId)
                .single();
            
            if (error || !threadData) {
                console.error("Error fetching chat data:", error); setLoading(false); return;
            }
            
            const typedThreadData = threadData as any as MessageThread;
            setThread(typedThreadData);

            if (typedThreadData.is_event_chat) {
                setOtherUser(null);
            } else {
                 const participant = typedThreadData.participants.find(p => p.user?.id && p.user.id !== currentUser.id);
                 const foundOtherUser = participant?.user || null;
                 setOtherUser(foundOtherUser);
                 if (foundOtherUser) {
                    const { data: orgData } = await supabase.from('organizations').select('id, name').eq('host_name', foundOtherUser.name).limit(1).single();
                    if (orgData) {
                        setIsOrgChat(true); setOrganizationName(orgData.name);
                    } else {
                        setIsOrgChat(false); setOrganizationName(null);
                    }
                    const u1 = Math.min(currentUser.id, foundOtherUser.id);
                    const u2 = Math.max(currentUser.id, foundOtherUser.id);
                    const { data: friendshipData } = await supabase.from('friends').select('*').eq('user_id_1', u1).eq('user_id_2', u2).single();
                    if (friendshipData) {
                        if (friendshipData.status === 'accepted') setFriendshipStatus('friends');
                        else if (friendshipData.status === 'pending') {
                            setFriendshipStatus(friendshipData.action_user_id === currentUser.id ? 'pending_me' : 'pending_them');
                        }
                    } else {
                        setFriendshipStatus('not_friends');
                    }
                }
            }

            const { data: messagesData } = await supabase.from('messages').select('*').eq('thread_id', chatId).order('created_at', { ascending: true });
            if (messagesData) setMessages(messagesData as Message[]);
            setLoading(false);
        };
        
        if (currentUser) fetchChatData();
        else if (!authLoading) navigate('/login');
        
    }, [chatId, navigate, isAiMentorChat, currentUser, authLoading]);

    useEffect(() => {
        if (isAiMentorChat || !chatId) return;
        const channel = supabase.channel(`chat:${chatId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${chatId}` },
            (payload) => {
                if (payload.new.sender_id !== currentUser?.id) {
                    setMessages(currentMessages => [...currentMessages, payload.new as Message]);
                }
            }
        ).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [chatId, isAiMentorChat, currentUser?.id]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) setIsOptionsMenuOpen(false);
            if (emojiMenuRef.current && !emojiMenuRef.current.contains(event.target as Node)) setIsEmojiMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages.length, isAiReplying]);
    
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (newMessage.trim() === '' || !currentUser) return;

        const textToSend = newMessage;
        setNewMessage('');
        
        if (isAiMentorChat) {
            if (!aiChat) return;
            const userMessage: Message = { id: Date.now(), text: textToSend, created_at: new Date().toISOString(), sender_id: currentUser.id, thread_id: 'ai-mentor' };
            setMessages(prev => [...prev, userMessage]);
            setIsAiReplying(true);
            try {
                const response = await aiChat.sendMessage({ message: textToSend });
                const aiResponse: Message = { id: Date.now() + 1, text: response.text, created_at: new Date().toISOString(), sender_id: -1, thread_id: 'ai-mentor' };
                setMessages(prev => [...prev, aiResponse]);
            } catch (error) {
                 const errorResponse: Message = { id: Date.now() + 1, text: "Beklager, der opstod en fejl. Prøv venligst igen.", created_at: new Date().toISOString(), sender_id: -1, thread_id: 'ai-mentor' };
                setMessages(prev => [...prev, errorResponse]);
            } finally { setIsAiReplying(false); }
        } else {
            const optimisticMessage: Message = { id: `temp-${Date.now()}`, text: textToSend, created_at: new Date().toISOString(), sender_id: currentUser.id, thread_id: Number(chatId), };
            setMessages(currentMessages => [...currentMessages, optimisticMessage]);
            const { data, error } = await supabase.from('messages').insert({ thread_id: Number(chatId), sender_id: currentUser.id, text: textToSend, }).select().single();
            if (error) { setMessages(currentMessages => currentMessages.filter(m => m.id !== optimisticMessage.id)); setNewMessage(textToSend); } 
            else if (data) { setMessages(currentMessages => currentMessages.map(m => (m.id === optimisticMessage.id ? (data as Message) : m))); }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleEmojiClick = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        textAreaRef.current?.focus();
    };
    
    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            const scrollHeight = textAreaRef.current.scrollHeight;
            textAreaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [newMessage]);
    
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !currentUser || !chatId || isAiMentorChat) return;
        const file = e.target.files[0];
        e.target.value = '';
        setIsUploading(true);
        const previewUrl = URL.createObjectURL(file);
        const optimisticMessage: Message = { id: `temp-img-${Date.now()}`, text: '', created_at: new Date().toISOString(), sender_id: currentUser.id, thread_id: Number(chatId), image_url: previewUrl };
        setMessages(currentMessages => [...currentMessages, optimisticMessage]);
        try {
            const finalUrl = await uploadFile(file);
            const { data, error } = await supabase.from('messages').insert({ thread_id: Number(chatId), sender_id: currentUser.id, text: '', image_url: finalUrl }).select().single();
            if (error) throw error;
            if (data) { setMessages(currentMessages => currentMessages.map(m => (m.id === optimisticMessage.id ? (data as Message) : m))); }
        } catch (error) { setMessages(currentMessages => currentMessages.filter(m => m.id !== optimisticMessage.id)); } 
        finally { setIsUploading(false); URL.revokeObjectURL(previewUrl); }
    };
    
    const handleSendFriendRequest = async () => {
        if (!currentUser || !otherUser || friendshipStatus !== 'not_friends') return;
        setFriendshipStatus('loading');
        const u1 = Math.min(currentUser.id, otherUser.id); const u2 = Math.max(currentUser.id, otherUser.id);
        const { error } = await supabase.from('friends').insert({ user_id_1: u1, user_id_2: u2, action_user_id: currentUser.id, status: 'pending' });
        if (error) { setFriendshipStatus('not_friends'); } else { setFriendshipStatus('pending_me'); }
    };

    const renderFriendButton = () => {
        const baseClasses = "font-bold py-2 px-4 rounded-full text-sm transition-colors";
        switch(friendshipStatus) {
            case 'not_friends': return <button onClick={handleSendFriendRequest} className={`bg-primary text-white ${baseClasses} hover:bg-primary-dark`}>Tilføj ven</button>;
            case 'pending_me': return <button disabled className={`bg-gray-200 text-gray-500 ${baseClasses} cursor-not-allowed`}>Anmodning sendt</button>;
            case 'pending_them': return <button disabled className={`bg-gray-200 text-gray-500 ${baseClasses} cursor-not-allowed`}>Anmodning modtaget</button>;
            case 'friends': return <button disabled className={`bg-green-100 text-green-700 ${baseClasses} cursor-not-allowed`}>Venner</button>;
            case 'loading': return <button disabled className={`bg-gray-200 text-gray-500 ${baseClasses} cursor-wait`}>...</button>;
            default: return <div className="w-24 h-8" />;
        }
    };

    const renderHeaderActions = () => {
        if (isAiMentorChat || thread?.is_event_chat || !otherUser || isOrgChat) return null;
        return (
            <div className="flex items-center space-x-1">
                {renderFriendButton()}
                <div className="relative" ref={optionsMenuRef}>
                    <button onClick={() => setIsOptionsMenuOpen(prev => !prev)} className="p-2 text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-surface-light rounded-full" aria-label="Flere valg"><MoreVertical size={24} /></button>
                    {isOptionsMenuOpen && (<div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface rounded-lg shadow-xl z-20 border border-gray-100 dark:border-dark-border"><button onClick={() => { setIsReportModalOpen(true); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 font-semibold">Anmeld {otherUser.name}</button></div>)}
                </div>
            </div>
        );
    };

    if (authLoading || loading) return <LoadingScreen message="Indlæser chat..." />;
    if (!thread && !isAiMentorChat) return (<div className="p-4 text-center"><p>Chat not found.</p><button onClick={() => navigate('/chat')} className="text-primary mt-4">Tilbage til chats</button></div>);
    if (!isAiMentorChat && !thread?.is_event_chat && !otherUser) return (<div className="p-4 text-center"><p>Kunne ikke indlæse deltagerinformation.</p><button onClick={() => navigate('/chat')} className="text-primary mt-4">Tilbage til chats</button></div>);
    
    const getMessageTimestamp = (msg: Message) => new Date(msg.created_at).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
    const isGroupChat = thread?.is_event_chat;
    const headerTitle = isGroupChat ? (thread.event?.title || 'Event Chat') : (otherUser?.name);
    const headerSubtitle = isGroupChat ? `${thread.participants.length} deltagere` : isOrgChat && organizationName ? `User fra ${organizationName}` : (otherUser?.online ? 'Online' : 'Offline');

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
            <header className="flex items-center p-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary"><ArrowLeft size={28} /></button>
                {otherUser && !isGroupChat && <PrivateImage src={otherUser.avatar_url} alt={otherUser.name} className="w-10 h-10 rounded-full ml-2 object-cover" />}
                <div className="flex-1 text-left ml-3">
                    <h2 className="font-bold text-lg text-text-primary dark:text-dark-text-primary flex items-center">{headerTitle}{isAiMentorChat && <BrainCircuit className="w-5 h-5 ml-1 text-accent" strokeWidth={2.5}/>}{isGroupChat && <Users className="w-5 h-5 ml-2 text-primary" />}</h2>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{headerSubtitle}</p>
                </div>
                <div className="min-w-[140px] flex justify-end">{renderHeaderActions()}</div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-2">
                {!isAiMentorChat && !isGroupChat && !isOrgChat && thread?.match_timestamp && <MeetingTimer matchTimestamp={thread.match_timestamp} />}
                {!isAiMentorChat && (<div className="text-center text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg my-4 max-w-md mx-auto flex items-center justify-center shadow-sm"><Lock size={14} className="mr-2 flex-shrink-0 text-blue-500" /><span className="leading-snug">Beskeder er beskyttet med end-to-end-kryptering. Det er kun personer i denne chat, der kan læse, lytte til eller dele dem.</span></div>)}
                
                {messages.map((msg, index) => {
                    const isCurrentUser = msg.sender_id === currentUser?.id;
                    const isAi = msg.sender_id === -1;
                    const isUploadingImage = msg.id.toString().startsWith('temp-img-');
                    const prevSenderId = messages[index - 1]?.sender_id;
                    const nextSenderId = messages[index + 1]?.sender_id;
                    const isFirstInGroup = msg.sender_id !== prevSenderId;
                    const isLastInGroup = msg.sender_id !== nextSenderId;
                    let bubbleClasses = isCurrentUser ? `bg-primary text-white dark:bg-primary-dark dark:text-dark-text-primary ${isFirstInGroup ? 'rounded-t-2xl' : 'rounded-tr-lg'} ${isLastInGroup ? 'rounded-bl-2xl' : 'rounded-l-lg'}` : `bg-white dark:bg-dark-surface-light text-text-primary dark:text-dark-text-primary ${isFirstInGroup ? 'rounded-t-2xl' : 'rounded-tl-lg'} ${isLastInGroup ? 'rounded-br-2xl' : 'rounded-r-lg'}`;

                    return (
                        <motion.div key={msg.id} className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                            {!isCurrentUser && (<div className="w-8 flex-shrink-0 self-end">{isLastInGroup && otherUser && <PrivateImage src={otherUser.avatar_url} alt={otherUser.name} className="w-8 h-8 rounded-full object-cover"/>}</div>)}
                            <div className={`flex flex-col max-w-[80%] shadow-sm ${bubbleClasses}`}>
                                <div className={`${msg.image_url ? 'p-1' : 'px-3 py-2'}`}>
                                    <div className="flex items-end space-x-2">
                                        <div className="flex-1">
                                            {msg.image_url ? (<div className="relative"><PrivateImage src={msg.image_url} alt="Sent image" className="rounded-lg max-w-[250px] w-full cursor-pointer" onClick={() => !isUploadingImage && setViewingImage(msg.image_url)} />{isUploadingImage && (<div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center"><Loader2 className="animate-spin text-white" size={24} /></div>)}</div>) : msg.text && (isAi ? <MarkdownRenderer text={msg.text} /> : <p className="break-words whitespace-pre-wrap">{msg.text}</p>)}
                                        </div>
                                         <p className={`text-xs whitespace-nowrap self-end opacity-70 ${isCurrentUser ? 'text-gray-200' : 'text-gray-500 dark:text-dark-text-secondary'} ${msg.image_url ? 'absolute bottom-2 right-2 bg-black/30 text-white rounded px-1' : ''}`}>{getMessageTimestamp(msg)}</p>
                                    </div>
                                    {msg.card_data && <CardMessage card={msg.card_data} isCurrentUser={isCurrentUser} />}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
                {isAiReplying && (<div className="flex justify-start"><div className="flex items-center space-x-2 bg-gray-100 dark:bg-dark-surface-light text-gray-800 dark:text-dark-text-primary rounded-t-2xl rounded-br-2xl px-3 py-2"><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-0"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div></div></div>)}
                 <div ref={messagesEndRef} />
            </main>

            <footer className="p-3 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky bottom-0">
                <AnimatePresence>
                {isEmojiMenuOpen && (
                     <motion.div
                        ref={emojiMenuRef}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mb-2"
                     >
                        <div className="h-64 bg-gray-50 dark:bg-dark-surface-light rounded-2xl p-2 border border-gray-200 dark:border-dark-border">
                             <div className="h-full grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1 overflow-y-auto">
                                {Object.values(emojiCategories).flat().map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => handleEmojiClick(emoji)}
                                        className="text-2xl rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border aspect-square flex items-center justify-center"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                     </motion.div>
                )}
                </AnimatePresence>
                <form onSubmit={handleSendMessage} className="flex items-end space-x-2 max-w-3xl mx-auto">
                    <div className="flex items-center w-full p-1 bg-gray-100 dark:bg-dark-surface-light rounded-2xl transition-all duration-300">
                        {!isAiMentorChat && (<button type="button" onClick={() => imageInputRef.current?.click()} disabled={isUploading} className="p-2 text-gray-500 dark:text-dark-text-secondary hover:text-primary rounded-full disabled:opacity-50" aria-label="Upload image">{isUploading ? <Loader2 className="animate-spin" size={24} /> : <ImageIcon size={24} />}</button>)}
                        <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" disabled={isUploading}/>
                        <button type="button" onClick={() => setIsEmojiMenuOpen(p => !p)} className="p-2 text-gray-500 dark:text-dark-text-secondary hover:text-primary rounded-full"><Smile size={24} /></button>
                        <textarea
                            ref={textAreaRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Send en besked..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 dark:text-dark-text-primary placeholder-gray-500 dark:placeholder-dark-text-secondary px-2 py-2 resize-none max-h-32"
                            aria-label="Chat message input"
                            rows={1}
                        />
                         <button type="submit" className="bg-primary text-white rounded-full p-2.5 flex-shrink-0 hover:bg-primary-dark transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!newMessage.trim() || isAiReplying} aria-label="Send message"><Send size={20} /></button>
                    </div>
                </form>
            </footer>
             <AnimatePresence>
                {viewingImage && (
                    <motion.div
                        className="fixed inset-0 bg-black/80 z-[101] flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setViewingImage(null)}
                    >
                        <motion.div
                            className="relative max-w-full max-h-full"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <PrivateImage src={viewingImage} alt="Full screen view" className="object-contain max-w-[95vw] max-h-[95vh] rounded-lg" />
                             <button onClick={() => setViewingImage(null)} className="absolute -top-2 -right-2 bg-white/20 text-white p-1.5 rounded-full hover:bg-white/30"><X size={24} /></button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {currentUser && otherUser && (<ReportUserModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} reporterUser={currentUser} reportedUser={otherUser}/>)}
        </div>
    );
};

export default ChatPage;