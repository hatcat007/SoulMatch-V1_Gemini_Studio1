import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { MessageThread, User } from '../../types';
import LoadingScreen from '../../components/LoadingScreen';
import { fetchPrivateFile } from '../../services/s3Service';
import { Loader2, Image as ImageIcon, MessageSquare } from 'lucide-react';

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            setLoading(true);
            fetchPrivateFile(src).then(url => {
                objectUrl = url;
                setImageUrl(url);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }

        return () => {
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    if(loading) {
        return <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light`}><Loader2 className="animate-spin text-gray-400" size={20}/></div>;
    }
    if(!imageUrl) {
        return <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light`}><ImageIcon className="text-gray-400" size={20}/></div>;
    }

    return <img src={imageUrl} alt={alt} className={className} />;
};

const OrganizationChatListPage: React.FC = () => {
    const { organization, loading: authLoading } = useAuth();
    const [threads, setThreads] = useState<MessageThread[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchThreads = async () => {
            if (!organization) {
                if(!authLoading) setLoading(false);
                return;
            }

            setLoading(true);
            // FIX: Call the secure RPC function instead of a broad select.
            // This ensures only the correct threads for the organization's host are fetched.
            const { data: threadsData, error } = await supabase.rpc('get_organization_chat_threads');

            if (error) {
                console.error('Error fetching organization chat threads via RPC:', error.message);
            } else {
                // The RPC function returns data pre-formatted, so we can cast it directly.
                setThreads(threadsData as MessageThread[] || []);
            }
            setLoading(false);
        };

        if (!authLoading) {
            fetchThreads();
        }
    }, [organization, authLoading]);

    if (authLoading || loading) {
        return <LoadingScreen message="Indlæser beskeder..." />;
    }

    const getOtherParticipant = (thread: MessageThread): User | null => {
        const participant = thread.participants.find(p => {
             if (!p.user) return false;
             return p.user.name !== organization?.host_name;
        });
        return participant?.user || null;
    }

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Beskeder</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-6">
                Her kan du se alle samtaler startet af brugere med din organisation.
            </p>

            <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm">
                {threads.length > 0 ? (
                    <div className="space-y-2">
                        {threads.map(thread => {
                            const otherUser = getOtherParticipant(thread);
                            if (!otherUser) return null;

                            const formattedTimestamp = new Date(thread.timestamp).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });

                            return (
                                <Link to={`/chat/${thread.id}`} key={thread.id} className="flex items-center p-3 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface-light transition-colors duration-200">
                                    <PrivateImage src={otherUser.avatar_url} alt={otherUser.name} className="w-12 h-12 rounded-full mr-4 object-cover" />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-bold text-text-primary dark:text-dark-text-primary">{otherUser.name}</p>
                                        <p className="text-sm text-text-secondary dark:text-dark-text-secondary truncate">{thread.last_message}</p>
                                    </div>
                                    <div className="text-right ml-2 flex-shrink-0">
                                        <p className="text-xs text-gray-400 mb-1">{formattedTimestamp}</p>
                                        {thread.unread_count > 0 && (
                                            <span className="bg-primary text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center ml-auto">
                                                {thread.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                         <MessageSquare size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                         <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Ingen beskeder endnu</h3>
                         <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Når en bruger sender en besked til din organisation, vil den dukke op her.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganizationChatListPage;