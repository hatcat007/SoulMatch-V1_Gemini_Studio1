import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, MessageSquare, Loader2, BrainCircuit } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DropInInvitation, Interest } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import { fetchPrivateFile } from '../services/s3Service';

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            fetchPrivateFile(src).then(url => { objectUrl = url; setImageUrl(url); });
        }
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [src]);
    if (!imageUrl) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light animate-pulse`} />;
    return <img src={imageUrl} alt={alt} className={className} />;
};

const Countdown: React.FC<{ expiry: string }> = ({ expiry }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(expiry) - +new Date();
        let timeLeft: { hours?: number, minutes?: number, seconds?: number } = {};

        if (difference > 0) {
            timeLeft = {
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearTimeout(timer);
    });

    if (!timeLeft.minutes && !timeLeft.seconds) return <span className="text-red-500">Udløbet</span>;
    return <span>{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>;
};


const DropInDetailPage: React.FC = () => {
    const { dropInId } = useParams<{ dropInId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [dropIn, setDropIn] = useState<DropInInvitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [messageLoading, setMessageLoading] = useState(false);

    const fetchDropInData = useCallback(async () => {
        if (!dropInId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('drop_in_invitations')
            .select('*, creator:users(*, personality_type, interests:user_interests(interest:interests(id, name)))')
            .eq('id', dropInId)
            .single();
            
        if (error) {
            console.error("Error fetching drop-in:", error);
        } else {
             const processedCreator = {
                ...data.creator,
                interests: data.creator.interests.map((i: any) => i.interest).filter(Boolean)
            };
            const processedDropIn = {
                ...data,
                creator: processedCreator
            };
            setDropIn(processedDropIn as DropInInvitation);
        }
        setLoading(false);
    }, [dropInId]);
    
    useEffect(() => {
        fetchDropInData();
    }, [fetchDropInData]);

    const handleSendMessage = async () => {
        if (!dropIn || !currentUser) return;
        if (dropIn.creator.id === currentUser.id) {
            alert("Du kan ikke sende en besked til dig selv.");
            return;
        }

        setMessageLoading(true);
        try {
            const { data: threadId, error } = await supabase.rpc('get_or_create_chat_thread', {
                p_friend_id: dropIn.creator.id
            });
            if (error) throw error;
            navigate(`/chat/${threadId}`);
        } catch (err: any) {
            console.error("Error starting chat:", err);
            setMessageLoading(false);
        }
    };
    
    if (loading) return <LoadingScreen message="Indlæser drop-in..." />;
    if (!dropIn) return <div className="p-4 text-center">Drop-in ikke fundet.</div>;

    const creatorInterests: Interest[] = dropIn.creator.interests || [];

    return (
        <div className="flex flex-col h-full bg-background dark:bg-dark-background">
             <header className="flex-shrink-0 flex items-center p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage">
                    <ArrowLeft size={24} />
                </button>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-lg">
                        <div className="flex items-start space-x-4 mb-6">
                             <div className="text-5xl flex-shrink-0">{dropIn.activity_icon}</div>
                             <p className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">
                                "{dropIn.message}"
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                             <div className="flex items-center text-text-secondary dark:text-dark-text-secondary">
                                <MapPin size={20} className="mr-3 text-primary flex-shrink-0" />
                                <span className="font-semibold">{dropIn.location_name}</span>
                            </div>
                             <div className="flex items-center text-text-secondary dark:text-dark-text-secondary">
                                <Clock size={20} className="mr-3 text-primary flex-shrink-0" />
                                <span className="font-semibold">Udløber om: <Countdown expiry={dropIn.expires_at} /></span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-dark-border">
                             <h3 className="text-xs font-bold uppercase text-text-secondary dark:text-dark-text-secondary mb-3">Vært</h3>
                             <div className="flex items-center">
                                <PrivateImage src={dropIn.creator.avatar_url} alt={dropIn.creator.name} className="w-12 h-12 rounded-full mr-3 object-cover" />
                                <div>
                                    <p className="font-bold text-text-primary dark:text-dark-text-primary">{dropIn.creator.name}</p>
                                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{dropIn.creator.age} år</p>
                                </div>
                            </div>
                             {(dropIn.creator.personality_type || creatorInterests.length > 0) && (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-border space-y-3">
                                    {dropIn.creator.personality_type && (
                                        <div className="flex items-center">
                                            <BrainCircuit size={16} className="mr-2 text-primary flex-shrink-0" />
                                            <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mr-2">Personlighed:</span>
                                            <span className="inline-block bg-primary-light dark:bg-primary/20 text-primary px-2 py-0.5 rounded-md text-sm font-bold">{dropIn.creator.personality_type}</span>
                                        </div>
                                    )}
                                    {creatorInterests.length > 0 && (
                                        <div>
                                            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">Interesser</p>
                                            <div className="flex flex-wrap gap-2">
                                                {creatorInterests.slice(0, 5).map(interest => (
                                                    <span key={interest.id} className="bg-gray-100 dark:bg-dark-surface-light text-text-secondary dark:text-dark-text-secondary px-3 py-1 rounded-full text-xs font-medium">
                                                        {interest.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="sticky bottom-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border p-4 z-10">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={handleSendMessage}
                        disabled={messageLoading}
                        className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50 flex items-center justify-center"
                    >
                        {messageLoading ? <Loader2 className="animate-spin" /> : <MessageSquare size={20} className="mr-2" />}
                        {messageLoading ? 'Starter chat...' : 'Send en besked for at joine'}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default DropInDetailPage;