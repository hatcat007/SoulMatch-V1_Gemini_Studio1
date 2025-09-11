import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Message, User, MessageThread } from '../types';
// FIX: Imported BrainCircuit icon to be used in the AI Mentor chat screen.
import { ArrowLeft, Send, Paperclip, Loader2, MoreVertical, X, Smile, Image as ImageIcon, BrainCircuit } from 'lucide-react';
import { fetchPrivateFile, uploadFile } from '../services/s3Service';
import LoadingScreen from '../components/LoadingScreen';
import MeetingTimer from '../components/MeetingTimer';
import ReportUserModal from '../components/ReportUserModal';
import { motion, AnimatePresence } from 'framer-motion';

type UIMessage = Message & { isUploading?: boolean; tempId?: string };

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        let isMounted = true;
        if (src) {
            setLoading(true);
            fetchPrivateFile(src).then(url => {
                if(isMounted) {
                    objectUrl = url;
                    setImageUrl(url);
                    setLoading(false);
                }
            }).catch(() => {
                if(isMounted) setLoading(false);
            });
        } else {
            setLoading(false);
        }
        return () => {
            isMounted = false;
            if (objectUrl && objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
        };
    }, [src]);

    if (loading) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light animate-pulse`} />;
    if (!imageUrl) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light flex items-center justify-center`}><ImageIcon className="text-gray-400" /></div>;
    return <img src={imageUrl} alt={alt} className={className} />;
};

const ChatPage: React.FC = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const { user: currentUser, organization, loading: authLoading } = useAuth();
    
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [thread, setThread] = useState<MessageThread | null>(null);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isAiMentorChat = chatId === 'ai-mentor';

    const fetchChatData = useCallback(async () => {
        if (!currentUser || !chatId || isAiMentorChat) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const { data: threadData, error: threadError } = await supabase
            .from('message_threads')
            .select('*, event:events(*), participants:message_thread_participants(user:users(*))')
            .eq('id', chatId)
            .single();

        if (threadError || !threadData) {
            console.error('Error fetching chat thread:', threadError);
            setLoading(false);
            navigate('/chat');
            return;
        }
        
        setThread(threadData as any);
        const participantData = threadData.participants.find((p: any) => p.user.id !== currentUser.id);
        if (participantData) {
            setOtherUser(participantData.user);
        }

        const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('thread_id', chatId)
            .order('created_at', { ascending: true });
        
        if (messagesError) console.error('Error fetching messages:', messagesError);
        else setMessages(messagesData || []);
        
        setLoading(false);
    }, [chatId, currentUser, navigate, isAiMentorChat]);

    useEffect(() => {
        fetchChatData();
    }, [fetchChatData]);

    useEffect(() => {
        if (!currentUser || isAiMentorChat || !chatId) return;

        const channel = supabase.channel(`messages:${chatId}`)
            .on<Message>(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${chatId}` },
                (payload) => {
                    if (payload.new.sender_id !== currentUser.id) {
                        setMessages(prev => [...prev, payload.new]);
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [chatId, currentUser, isAiMentorChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
     useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [newMessage]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUser || isAiMentorChat || isSending) return;
        
        setIsSending(true);
        const tempId = Date.now().toString();
        const optimisticMessage: UIMessage = {
            id: tempId, tempId, text: newMessage, created_at: new Date().toISOString(),
            sender_id: currentUser.id, thread_id: Number(chatId),
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        
        const { error } = await supabase.from('messages').insert({
            thread_id: Number(chatId), sender_id: currentUser.id, text: newMessage,
        });

        if (error) {
            setMessages(prev => prev.filter(m => m.id !== tempId)); // Revert on error
            setNewMessage(newMessage); // Restore text
        }
        setIsSending(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !currentUser || isAiMentorChat) return;
        const file = e.target.files[0];
        const tempId = Date.now().toString();
        const tempUrl = URL.createObjectURL(file);

        const optimisticMessage: UIMessage = {
            id: tempId,
            tempId, // Keep track of the temporary ID
            text: '',
            created_at: new Date().toISOString(),
            sender_id: currentUser.id,
            thread_id: Number(chatId),
            image_url: tempUrl,
            isUploading: true,
        };
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            // Step 1: Upload the file to S3
            const finalUrl = await uploadFile(file);

            // Step 2: Insert the message with the final S3 URL into the database and get the full row back
            const { data: insertedMessage, error } = await supabase
                .from('messages')
                .insert({
                    thread_id: Number(chatId),
                    sender_id: currentUser.id,
                    image_url: finalUrl,
                })
                .select()
                .single();

            if (error) throw error;
            
            // Step 3: Update the local state, replacing the temporary message with the final one from the DB
            setMessages(prev => 
                prev.map(msg => 
                    msg.tempId === tempId ? { ...insertedMessage, isUploading: false } : msg
                )
            );

        } catch (error) {
            console.error("Image upload failed:", error);
            // On failure, remove the optimistic message
            setMessages(prev => prev.filter(m => m.tempId !== tempId));
        } finally {
            // Step 4: Clean up the blob URL and reset file input
            URL.revokeObjectURL(tempUrl);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    if (authLoading || loading) return <LoadingScreen message="Indlæser chat..." />;

    const isOrgChat = !!organization;
    const isEventChat = !!thread?.is_event_chat;

    if (isAiMentorChat) {
         return (
            <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
                     <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage"><ArrowLeft size={24} /></button>
                     <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">SoulMatch AI Mentor</h1>
                     <div className="w-8"></div>
                </header>
                <main className="flex-1 flex flex-col items-center justify-center text-center p-8">
                     <BrainCircuit size={64} className="text-primary mb-4" />
                    <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">AI Mentor</h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Denne funktion er under udvikling.</p>
                </main>
            </div>
        );
    }
    
    if (!otherUser) return <div className="p-4 text-center">Kunne ikke finde den anden bruger i chatten.</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-surface">
            {showReportModal && currentUser && <ReportUserModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} reporterUser={currentUser} reportedUser={otherUser} />}
            <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
                <button onClick={() => navigate(-1)} className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary rounded-full"><ArrowLeft size={24} /></button>
                <div className="flex items-center">
                    <PrivateImage src={otherUser.avatar_url} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                    <div>
                        <p className="font-bold text-text-primary dark:text-dark-text-primary">{otherUser.name}</p>
                        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{otherUser.online ? 'Online' : 'Offline'}</p>
                    </div>
                </div>
                <div className="relative">
                     <button onClick={() => setShowOptions(p => !p)} className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary rounded-full"><MoreVertical size={24} /></button>
                     <AnimatePresence>
                     {showOptions && (
                        <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -10}} className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface-light rounded-lg shadow-xl z-10 border border-gray-100 dark:border-dark-border">
                            <button onClick={() => {setShowReportModal(true); setShowOptions(false);}} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-dark-border">Anmeld Bruger</button>
                        </motion.div>
                     )}
                     </AnimatePresence>
                </div>
            </header>
            
            {!isOrgChat && !isEventChat && thread?.match_timestamp && (
                <MeetingTimer matchTimestamp={thread.match_timestamp} />
            )}

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => {
                    // FIX: `currentUser.id` is a property, not a function. Removed parentheses.
                    const isSender = message.sender_id === currentUser?.id;
                    const prevMessage = messages[index - 1];
                    const showAvatar = !isSender && (!prevMessage || prevMessage.sender_id !== message.sender_id);
                    return (
                        <div key={message.id} className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
                            {showAvatar && <PrivateImage src={otherUser.avatar_url} alt={otherUser.name} className="w-8 h-8 rounded-full object-cover mb-1" />}
                            {!showAvatar && !isSender && <div className="w-8" />}
                            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${isSender ? 'bg-primary text-white rounded-br-lg' : 'bg-white dark:bg-dark-surface-light text-text-primary dark:text-dark-text-primary rounded-bl-lg'}`}>
                                {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
                                {message.image_url && (
                                    <div className="relative">
                                        <PrivateImage src={message.image_url} alt="sendt billede" className="rounded-lg max-w-full h-auto" />
                                        {message.isUploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg"><Loader2 className="animate-spin text-white"/></div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>
            
            <footer className="flex-shrink-0 p-3 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border">
                <div className="flex items-end gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-light"><Paperclip size={24}/></button>
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        placeholder="Skriv en besked..."
                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-dark-surface-light rounded-2xl resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button onClick={handleSendMessage} disabled={isSending} className="p-3 bg-primary text-white rounded-full hover:bg-primary-dark disabled:opacity-50"><Send size={24}/></button>
                </div>
            </footer>
        </div>
    );
};

export default ChatPage;