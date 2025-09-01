
import React from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MessageThread, User } from '../types';

const mockOnlineUsers: User[] = [
  { id: 1, name: 'Anne', age: 24, avatarUrl: 'https://picsum.photos/id/1011/100/100', online: true },
  { id: 2, name: 'Jens', age: 26, avatarUrl: 'https://picsum.photos/id/1025/100/100', online: true },
  { id: 3, name: 'Sofie', age: 22, avatarUrl: 'https://picsum.photos/id/1012/100/100', online: true },
];

const mockThreads: MessageThread[] = [
  { id: 1, user: mockOnlineUsers[0], lastMessage: 'Super! Vi ses i bio i morgen 😊', timestamp: '18:43', unreadCount: 3, matchTimestamp: Date.now() - (1 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000) },
  { id: 2, user: { id: 4, name: 'Victoria', age: 25, avatarUrl: 'https://picsum.photos/id/1013/100/100', online: false }, lastMessage: 'Omg! Vildt samme her!', timestamp: '16:43', unreadCount: 0 },
  { id: 3, user: mockOnlineUsers[1], lastMessage: 'Super fedt, har det på samme måde', timestamp: '14:43', unreadCount: 0 },
  { id: 4, user: mockOnlineUsers[2], lastMessage: 'Yeeeeeeah 👍', timestamp: '10:43', unreadCount: 0 },
];

const ChatListPage: React.FC = () => {
  return (
    <div className="p-4 flex flex-col h-full">
      <h1 className="text-3xl font-bold text-text-primary mb-4">Soul mates 💫</h1>
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
          {mockOnlineUsers.map(user => (
            <div key={user.id} className="flex flex-col items-center">
              <div className="relative">
                <img src={user.avatarUrl} alt={user.name} className="w-16 h-16 rounded-full" />
                <span className="absolute bottom-0 right-0 block h-4 w-4 rounded-full bg-green-500 border-2 border-white"></span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6 flex-1">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Alle beskeder</h2>
        <div className="space-y-2">
          {mockThreads.map(thread => (
            <Link to={`/chat/${thread.id}`} key={thread.id} className="flex items-center p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <img src={thread.user.avatarUrl} alt={thread.user.name} className="w-14 h-14 rounded-full mr-4"/>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-text-primary">{thread.user.name}</p>
                <p className="text-sm text-text-secondary truncate">{thread.lastMessage}</p>
              </div>
              <div className="text-right ml-2 flex-shrink-0">
                <p className="text-xs text-gray-400 mb-1">{thread.timestamp}</p>
                {thread.unreadCount > 0 && (
                  <span className="bg-primary text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center ml-auto">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatListPage;