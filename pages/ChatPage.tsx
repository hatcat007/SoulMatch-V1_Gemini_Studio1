

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Shield, Plus, Ticket } from 'lucide-react';
import type { Message, MessageThread, User } from '../types';

// Mock data - In a real app, this would come from a shared state/service
const mockOnlineUsers: User[] = [
  { id: 1, name: 'Anne', age: 24, avatarUrl: 'https://picsum.photos/id/1011/100/100', online: true },
  { id: 2, name: 'Jens', age: 26, avatarUrl: 'https://picsum.photos/id/1025/100/100', online: true },
  { id: 3, name: 'Sofie', age: 22, avatarUrl: 'https://picsum.photos/id/1012/100/100', online: true },
];

const mockThreads: MessageThread[] = [
  { 
    id: 1, 
    user: mockOnlineUsers[0], 
    lastMessage: 'Super, er der om 5min vi ses', 
    timestamp: '18:46', 
    unreadCount: 0,
    // Set match time to 1 day, 10 hours and 30 minutes ago to demonstrate the timer
    matchTimestamp: Date.now() - (1 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 30 * 60 * 1000) 
  },
  { id: 2, user: { id: 4, name: 'Victoria', age: 25, avatarUrl: 'https://picsum.photos/id/1013/100/100', online: false }, lastMessage: 'Omg! Vildt samme her!', timestamp: '16:43', unreadCount: 0 },
  { id: 3, user: mockOnlineUsers[1], lastMessage: 'Super fedt, har det på samme måde', timestamp: '14:43', unreadCount: 0 },
  { id: 4, user: mockOnlineUsers[2], lastMessage: 'Yeeeeeeah 👍', timestamp: '10:43', unreadCount: 0 },
];

const currentUserId = 99; // A mock ID for the current user

type ChatItem = Message | { type: 'date'; label: string; id: string; };

const mockMessages: { [key: number]: ChatItem[] } = {
  1: [
    { type: 'date', label: 'I går', id: 'date1' },
    { id: 1, text: 'Hej, hvordan går det?', timestamp: '12:31', senderId: currentUserId },
    { id: 2, text: 'Fint, hvad med dig? 😊', timestamp: '12:32', senderId: 1 },
    { type: 'date', label: 'I dag 18:30', id: 'date2' },
    { id: 3, text: 'Er du klar til i aften?', timestamp: '18:30', senderId: currentUserId },
    { id: 4, text: 'Yes! Glæder mig meget!', timestamp: '18:32', senderId: 1 },
    { id: 5, text: 'Jeg bestilte biograf billetter i går. Glæder mig til at mødes og snakkes ved.', timestamp: '18:33', senderId: 1 },
    { id: 6, text: 'Jeg er her nu 😊🎥', imageUrl: 'https://i.imgur.com/3nQ2nOD.jpg', timestamp: '18:40', senderId: 1 },
    { id: 7, text: 'Super, er der om 5min vi ses', timestamp: '18:46', senderId: currentUserId },
  ],
  2: [{ id: 8, text: 'Omg! Vildt samme her!', timestamp: '16:43', senderId: 4 }],
  3: [{ id: 9, text: 'Super fedt, har det på samme måde', timestamp: '14:43', senderId: 2 }],
  4: [{ id: 10, text: 'Yeeeeeeah 👍', timestamp: '10:43', senderId: 3 }],
};

const formatMeetingTime = (matchTimestamp?: number): string | null => {
    if (!matchTimestamp) return null;

    const totalDuration = 3 * 24 * 60 * 60 * 1000; // 3 days in ms
    const deadline = matchTimestamp + totalDuration;
    const difference = deadline - Date.now();

    if (difference <= 0) {
        return "Tiden for møde er udløbet";
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `Møde om ${days} ${days === 1 ? 'dag' : 'dage'}`;
    }
    if (hours > 0) {
        return `Møde om ${hours} ${hours === 1 ? 'time' : 'timer'}`;
    }
    if (minutes > 0) {
        return `Møde om ${minutes} ${minutes === 1 ? 'minut' : 'minutter'}`;
    }
    return `Møde om et øjeblik`;
};


const ChatPage: React.FC = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const thread = mockThreads.find(t => t.id.toString() === chatId);
    const [messages, setMessages] = useState<ChatItem[]>(mockMessages[Number(chatId)] || []);
    const [newMessage, setNewMessage] = useState('');
    
    const [meetingTimeText, setMeetingTimeText] = useState<string | null>(formatMeetingTime(thread?.matchTimestamp));

    useEffect(() => {
        if (!thread?.matchTimestamp) return;

        // Update every minute, which is sufficient for this display format
        const timer = setInterval(() => {
            setMeetingTimeText(formatMeetingTime(thread.matchTimestamp));
        }, 60000);

        return () => clearInterval(timer);
    }, [thread?.matchTimestamp]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages.length]);

    if (!thread) {
        return (
            <div className="p-4 text-center">
                <p>Chat not found.</p>
                <button onClick={() => navigate('/chat')} className="text-primary mt-4">Back to chats</button>
            </div>
        );
    }
    
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;

        const message: Message = {
            id: Date.now(),
            text: newMessage,
            timestamp: new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }),
            senderId: currentUserId,
        };

        setMessages([...messages, message]);
        setNewMessage('');
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface">
            {/* Header */}
            <header className="flex items-center p-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
                    <ArrowLeft size={28} />
                </button>
                <div className="flex-1 text-center">
                    <h2 className="font-bold text-lg text-text-primary dark:text-dark-text-primary flex items-center justify-center">
                        {thread.user.name}
                        <Shield className="w-5 h-5 ml-1 text-blue-500" strokeWidth={2.5} />
                    </h2>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Last seen 2hrs ago</p>
                    {meetingTimeText && (
                        <p className="text-xs text-text-secondary dark:text-dark-text-secondary font-semibold mt-1">{meetingTimeText}</p>
                    )}
                </div>
                <button className="bg-primary text-white font-bold py-2 px-4 rounded-full text-sm hover:bg-primary-dark transition-colors">
                    Tilføj ven
                </button>
            </header>

            {/* Messages */}
            <main className="flex-1 overflow-y-auto p-4 md:px-8 lg:px-16 space-y-4">
                {messages.map((item) => {
                    if ('type' in item && item.type === 'date') {
                        return (
                            <div key={item.id} className="text-center text-gray-500 dark:text-dark-text-secondary text-xs my-3">
                                {item.label}
                            </div>
                        );
                    }
                    
                    const msg = item as Message;
                    const isCurrentUser = msg.senderId === currentUserId;

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
                                {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="Chat content" className="rounded-xl m-1" />
                                )}
                                <div className="flex items-end space-x-2 px-3 py-2">
                                    {msg.text && <p className="break-words">{msg.text}</p>}
                                    <p className={`text-xs whitespace-nowrap self-end ${isCurrentUser ? 'text-gray-200' : 'text-gray-500 dark:text-dark-text-secondary'}`}>{msg.timestamp}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                 <div ref={messagesEndRef} />
            </main>

            {/* Input */}
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