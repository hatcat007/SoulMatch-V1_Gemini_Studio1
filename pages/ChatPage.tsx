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


const ChatPage: React.FC = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const thread = mockThreads.find(t => t.id.toString() === chatId);
    const [messages, setMessages] = useState<ChatItem[]>(mockMessages[Number(chatId)] || []);
    const [newMessage, setNewMessage] = useState('');

    const calculateTimeLeft = () => {
        if (!thread?.matchTimestamp) return '';
    
        const deadline = thread.matchTimestamp + 3 * 24 * 60 * 60 * 1000;
        const difference = deadline - Date.now();
    
        if (difference <= 0) {
            return "Tiden er udløbet!";
        }
    
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
        let timerString = '';
        if (days > 0) {
            timerString = `${days} ${days === 1 ? 'dag' : 'dage'}, ${hours} ${hours === 1 ? 'time' : 'timer'}`;
        } else if (hours > 0) {
            timerString = `${hours} ${hours === 1 ? 'time' : 'timer'}, ${minutes} min`;
        } else if (minutes > 0) {
            timerString = `${minutes} min, ${seconds} sek`;
        } else {
            timerString = `${seconds} sek`;
        }
    
        return `Skal mødes inden: ${timerString}`;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        if (!thread?.matchTimestamp) return;

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

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
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <header className="flex items-center p-3 border-b border-gray-200 bg-white sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:text-primary">
                    <ArrowLeft size={28} />
                </button>
                <div className="flex-1 text-center">
                    <h2 className="font-bold text-lg text-text-primary flex items-center justify-center">
                        {thread.user.name}
                        <Shield className="w-5 h-5 ml-1 text-blue-500" strokeWidth={2.5} />
                    </h2>
                    <p className="text-xs text-text-secondary">Last seen 2hrs ago</p>
                     {timeLeft && (
                         <p className="text-sm text-rose-500 font-semibold mt-1">
                            {timeLeft}
                         </p>
                    )}
                </div>
                <button className="bg-primary text-white font-bold py-2 px-4 rounded-full text-sm hover:bg-primary-dark transition-colors">
                    Tilføj ven
                </button>
            </header>

            {/* Messages */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((item) => {
                    if ('type' in item && item.type === 'date') {
                        return (
                            <div key={item.id} className="text-center text-gray-500 text-xs my-3">
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
                                        : 'bg-gray-100 text-gray-800 rounded-t-2xl rounded-br-2xl'
                                }`}
                            >
                                {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="Chat content" className="rounded-xl m-1" />
                                )}
                                <div className="flex items-end space-x-2 px-3 py-2">
                                    {msg.text && <p className="break-words">{msg.text}</p>}
                                    <p className={`text-xs whitespace-nowrap self-end ${isCurrentUser ? 'text-gray-200' : 'text-gray-500'}`}>{msg.timestamp}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                 <div ref={messagesEndRef} />
            </main>

            {/* Input */}
            <footer className="p-3 border-t border-gray-200 bg-white sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <div className="flex items-center w-full p-1 border border-gray-300 rounded-full">
                         <button type="button" className="p-2 text-primary hover:bg-primary-light rounded-full" aria-label="Add content">
                            <Plus size={24} />
                        </button>
                        <button type="button" className="p-2 text-primary hover:bg-primary-light rounded-full" aria-label="Add ticket">
                            <Ticket size={24} />
                        </button>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Send en besked"
                            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-700 placeholder-gray-400 px-2"
                            aria-label="Chat message input"
                        />
                         <button
                            type="submit"
                            className="text-primary rounded-full p-2 flex-shrink-0 hover:bg-primary-light transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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