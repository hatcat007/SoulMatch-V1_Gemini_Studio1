import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { DropInInvitation } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import { fetchPrivateFile } from '../services/s3Service';
import { ArrowLeft, MapPin, Clock, MessageSquare, Loader2 } from 'lucide-react';

const Countdown: React.FC<{ expiry: string }> = ({ expiry }) => {
    const calculateTimeLeft = useCallback(() => {
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
    }, [expiry]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearTimeout(timer);
    });

    if (!timeLeft.hours && !timeLeft.minutes && !timeLeft.seconds) {
        return <span className="font-bold text-red-500">Udløbet</span>;
    }

    return <span className="font-bold text-primary">{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>;
};


const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            fetchPrivateFile(src).then(url => { objectUrl = url; setImageUrl(url); });
        }
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [src]);

    if (!imageUrl) return <div className={`${className} bg-gray-200 animate-pulse`} />;
    return <img src={imageUrl} alt={alt} className={className} />;
};


const DropInDetailPage: React.FC = () => {
    const { dropInId } = useParams<{ dropInId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    
    const [dropIn, setDropIn] = useState<DropInInvitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);

    useEffect(() => {
        const fetchDropIn = async () => {
            if (!dropInId) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('drop_in_invitations')
                .select('*, creator:users(*)')
                .eq('id', dropInId)
                .single();

            if (error || !data) {
                console.error('Error fetching drop-in:', error);
            } else {
                setDropIn(data);
            }
            setLoading(false);
        };
        fetchDropIn();
    }, [dropInId]);

    const handleJoinChat = async () => {
        if (!currentUser || !dropIn) return;
        setIsJoining(true);

        const { data: threadId, error } = await supabase.rpc('get_or_create_chat_thread', {
            p_friend_id: dropIn.creator_user_id
        });

        if (error || !threadId) {
            alert('Kunne ikke starte chat. Prøv igen.');
            console.error(error);
        } else {
            navigate(`/chat/${threadId}`);
        }
        setIsJoining(false);
    };

    if (loading) return <LoadingScreen message="Indlæser drop-in..." />;
    if (!dropIn) return <div className="p-4 text-center">Drop-in ikke fundet.</div>;

    return (
        <div className="flex flex-col h-full bg-background dark:bg-dark-background">
            <header className="fixed top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md dark:bg-dark-surface/90">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft size={24} /></button>
                    <h1 className="text-xl font-bold">Spontan Drop-in</h1>
                    <div className="w-8"></div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pt-20">
                <div className="max-w-2xl mx-auto p-4 md:p-6 text-center">
                    <div className="text-6xl mb-6">{dropIn.activity_icon}</div>
                    <p className="text-2xl font-bold text-text-primary dark:text-dark-text-primary px-4">"{dropIn.message}"</p>
                    
                    <div className="flex items-center justify-center mt-6 space-x-4">
                        <PrivateImage src={dropIn.creator.avatar_url} alt={dropIn.creator.name} className="w-12 h-12 rounded-full object-cover"/>
                        <div>
                            <p className="font-bold text-text-primary dark:text-dark-text-primary">{dropIn.creator.name}</p>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">har startet dette drop-in</p>
                        </div>
                    </div>
                    
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        <div className="p-4 bg-white dark:bg-dark-surface rounded-lg">
                            <div className="flex items-center text-primary mb-2"><MapPin size={20} className="mr-2"/> <span className="font-bold">Lokation</span></div>
                            <p>{dropIn.location_name}</p>
                        </div>
                        <div className="p-4 bg-white dark:bg-dark-surface rounded-lg">
                             <div className="flex items-center text-primary mb-2"><Clock size={20} className="mr-2"/> <span className="font-bold">Udløber om</span></div>
                             <Countdown expiry={dropIn.expires_at} />
                        </div>
                    </div>
                </div>
            </main>

            {currentUser?.id !== dropIn.creator_user_id &&
                <footer className="sticky bottom-0 bg-white dark:bg-dark-surface border-t p-4 z-10">
                    <div className="max-w-2xl mx-auto">
                        <button onClick={handleJoinChat} disabled={isJoining} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg flex items-center justify-center disabled:opacity-50">
                            {isJoining ? <Loader2 className="animate-spin" /> : <><MessageSquare size={20} className="mr-2"/> Send Besked & Join</>}
                        </button>
                    </div>
                </footer>
            }
        </div>
    );
};

export default DropInDetailPage;
