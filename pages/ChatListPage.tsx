
import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { MessageThread, User } from '../types';
import { supabase } from '../services/supabase';

const ChatListPage: React.FC = () => {
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch online users
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('online_status', true);

        if (usersError) throw usersError;
        
        const formattedUsers: User[] = usersData.map(user => ({
          id: user.id,
          name: user.name,
          age: user.age,
          avatarUrl: user.avatar_url,
          online: user.online_status,
        }));
        setOnlineUsers(formattedUsers);

        // Fetch message threads with user data
        const { data: threadsData, error: threadsError } = await supabase
          .from('message_threads')
          .select('*, user:profiles(*)');

        if (threadsError) throw threadsError;
        
        const formattedThreads: MessageThread[] = threadsData.map(thread => ({
          id: thread.id,
          lastMessage: thread.last_message,
          timestamp: thread.timestamp,
          unreadCount: thread.unread_count,
          user: {
            id: thread.user.id,
            name: thread.user.name,
            age: thread.user.age,
            avatarUrl: thread.user.avatar_url,
            online: thread.user.online_status,
          },
        }));
        setThreads(formattedThreads);

      } catch (err: any) {
        setError('Kunne ikke hente beskeder. Prøv igen senere.');
        console.error('Error fetching chat data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Henter chats...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

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
          {onlineUsers.map(user => (
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
        <div className="space-y-4">
          {threads.map(thread => (
            <div key={thread.id} className="flex items-center">
              <img src={thread.user.avatarUrl} alt={thread.user.name} className="w-14 h-14 rounded-full mr-4"/>
              <div className="flex-1">
                <p className="font-bold text-text-primary">{thread.user.name}</p>
                <p className="text-sm text-text-secondary truncate">{thread.lastMessage}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">{thread.timestamp}</p>
                {thread.unreadCount > 0 && (
                  <span className="bg-primary text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatListPage;
