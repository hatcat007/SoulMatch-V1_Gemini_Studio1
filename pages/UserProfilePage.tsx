import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { User, FriendshipStatus, Interest, PersonalityTag } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import { fetchPrivateFile } from '../services/s3Service';
import { ArrowLeft, MessageSquare, UserPlus, Check, UserCheck, Loader2, MoreVertical, Star, BrainCircuit, Heart } from 'lucide-react';
import ReportUserModal from '../components/ReportUserModal';
import { calculateMatches, MatchDetails } from '../services/matchingService';
import { motion } from 'framer-motion';

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

const MatchScoreDisplay: React.FC<{ match: MatchDetails }> = ({ match }) => {
    const { combined, personality, interestAndTagPercent } = match.scores;

    const radius = 80;
    const circumference = 2 * Math.PI * (radius - 10);
    const offset = circumference - (combined / 100) * circumference;

    return (
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm text-center">
            <h3 className="font-bold text-lg mb-4 text-text-primary dark:text-dark-text-primary">Jeres Match Score</h3>
            <div className="relative w-48 h-48 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        className="text-gray-200 dark:text-dark-border"
                        strokeWidth="12"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius - 10}
                        cx="100"
                        cy="100"
                    />
                    <motion.circle
                        className="text-primary"
                        strokeWidth="12"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius - 10}
                        cx="100"
                        cy="100"
                        style={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold text-primary">{Math.round(combined)}%</span>
                    <span className="text-sm font-semibold text-text-secondary dark:text-dark-text-secondary">Match</span>
                </div>
            </div>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-4 max-w-xs mx-auto">
                Dette er en samlet score baseret på jeres personlighed og fælles interesser.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-dark-surface-light rounded-lg">
                    <p className="font-bold text-lg text-text-primary dark:text-dark-text-primary flex items-center justify-center"><BrainCircuit size={16} className="mr-1.5 text-purple-500"/> {personality}%</p>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Personlighed</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-surface-light rounded-lg">
                    <p className="font-bold text-lg text-text-primary dark:text-dark-text-primary flex items-center justify-center"><Heart size={16} className="mr-1.5 text-red-500"/> {interestAndTagPercent}%</p>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Interesser</p>
                </div>
            </div>
        </div>
    );
};

const UserProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [profile, setProfile] = useState<User | null>(null);
    const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus | 'not_friends' | 'request_sent' | 'request_received'>('not_friends');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!userId || !currentUser) return;
        setLoading(true);

        const profilePromise = supabase
            .from('users')
            .select('*, interests(*), personality_tags(*), personality_dimensions:user_personality_dimensions(*)')
            .eq('id', userId)
            .single();

        const currentUserPromise = supabase
            .from('users')
            .select('*, interests(*), personality_tags(*), personality_dimensions:user_personality_dimensions(*)')
            .eq('id', currentUser.id)
            .single();
            
        const friendshipPromise = supabase.rpc('get_friendship_status', { p_user_id: currentUser.id, p_friend_id: Number(userId) });

        const [profileRes, currentUserRes, friendship] = await Promise.all([profilePromise, currentUserPromise, friendshipPromise]);
        
        const { data: profileData, error: profileError } = profileRes;
        if (profileError || !profileData) {
            console.error(profileError); setLoading(false); return;
        }
        
        const { data: currentUserData, error: currentUserError } = currentUserRes;
        if (currentUserError || !currentUserData) {
            console.error("Could not fetch current user's full data for matching", currentUserError);
            setLoading(false); 
            return;
        }

        // Calculate match score
        const viewedProfileForMatch = {
            ...profileData, interests: profileData.interests || [],
            personality_tags: profileData.personality_tags || [],
            dimensions: profileData.personality_dimensions || [],
        };
        const currentUserForMatch = {
            ...currentUserData, interests: currentUserData.interests || [],
            personality_tags: currentUserData.personality_tags || [],
            dimensions: currentUserData.personality_dimensions || [],
        };

        const results = calculateMatches(currentUserForMatch, [viewedProfileForMatch]);
        if (results.combined.length > 0) {
            setMatchDetails(results.combined[0]);
        }
        
        setProfile(profileData as User);

        // Set friendship status
        if (friendship.data) {
            if (friendship.data.status === 'accepted') setFriendshipStatus('accepted');
            else if (friendship.data.status === 'pending') {
                setFriendshipStatus(friendship.data.action_user_id === currentUser.id ? 'request_sent' : 'request_received');
            }
        } else {
            setFriendshipStatus('not_friends');
        }

        setLoading(false);
    }, [userId, currentUser]);

    useEffect(() => {
        if (Number(userId) === currentUser?.id) {
            navigate('/profile', { replace: true });
        } else {
            fetchProfile();
        }
    }, [userId, currentUser, navigate, fetchProfile]);

    const handleAddFriend = async () => {
        if (!currentUser || !profile) return;
        setActionLoading(true);
        const u1 = Math.min(currentUser.id, profile.id);
        const u2 = Math.max(currentUser.id, profile.id);
        
        await supabase.from('friends').insert({
            user_id_1: u1, user_id_2: u2, status: 'pending', action_user_id: currentUser.id
        });
        setFriendshipStatus('request_sent');
        setActionLoading(false);
    };

    const handleSendMessage = async () => {
        if (!profile) return;
        setActionLoading(true);
        const { data: threadId, error } = await supabase.rpc('get_or_create_chat_thread', { p_friend_id: profile.id });
        if (error || !threadId) {
            alert('Kunne ikke starte chat.');
            console.error(error);
        } else {
            navigate(`/chat/${threadId}`);
        }
        setActionLoading(false);
    };

    if (loading) return <LoadingScreen message="Indlæser profil..." />;
    if (!profile) return <div className="p-4 text-center">Bruger ikke fundet.</div>;
    
    const interests: Interest[] = profile.interests || [];
    const tags: PersonalityTag[] = profile.personality_tags || [];
    
    const renderActionButton = () => {
        if (actionLoading) return <button disabled className="btn-primary w-full flex justify-center"><Loader2 className="animate-spin"/></button>;

        switch (friendshipStatus) {
            case 'accepted':
                return <button onClick={handleSendMessage} className="btn-primary w-full flex justify-center"><MessageSquare className="mr-2"/> Send Besked</button>;
            case 'request_sent':
                return <button disabled className="btn-secondary w-full flex justify-center"><Check className="mr-2"/> Anmodning Sendt</button>;
            case 'request_received':
                 return <button onClick={() => navigate('/friends')} className="btn-primary w-full flex justify-center"><UserCheck className="mr-2"/> Svar på Anmodning</button>;
            default:
                 return <button onClick={handleAddFriend} className="btn-primary w-full flex justify-center"><UserPlus className="mr-2"/> Tilføj Ven</button>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
            {currentUser && <ReportUserModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} reporterUser={currentUser} reportedUser={profile} />}

            <header className="flex-shrink-0 bg-white dark:bg-dark-surface p-4 border-b border-gray-200 dark:border-dark-border">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft /></button>
                    <h1 className="text-xl font-bold text-primary">{profile.name}</h1>
                    <button onClick={() => setIsReportModalOpen(true)} className="p-2 -mr-2"><MoreVertical /></button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-24">
                <div className="max-w-xl mx-auto">
                    <div className="relative">
                        <div className="h-48 bg-gray-200 dark:bg-dark-surface-light">
                            <img src="https://q1f3.c3.e2-9.dev/soulmatch-uploads-public/soulmatch%20-%20cover1.png" alt="Profil cover" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                            <PrivateImage src={profile.avatar_url} alt={profile.name} className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-dark-surface shadow-lg" />
                        </div>
                    </div>
                    
                    <div className="p-4 space-y-6">
                        <section className="text-center pt-16">
                            <h2 className="text-3xl font-bold">{profile.name}, {profile.age}</h2>
                            <p className="text-text-secondary">{profile.location}</p>
                            {profile.personality_type && <p className="mt-2 text-lg font-bold text-primary">{profile.personality_type}</p>}
                        </section>

                        {matchDetails && <MatchScoreDisplay match={matchDetails} />}
                        
                        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                            <h3 className="font-bold text-lg mb-2">Bio</h3>
                            <p className="text-text-secondary whitespace-pre-wrap">{profile.bio || "Ingen bio tilføjet."}</p>
                        </div>
                        
                        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                            <div className="mb-6">
                                <h3 className="font-bold text-lg mb-3">Interesser</h3>
                                <div className="flex flex-wrap gap-2">
                                    {interests.length > 0 ? interests.map(i => <span key={i.id} className="tag-interest">{i.name}</span>) : <p className="text-sm text-text-secondary">Ingen interesser valgt.</p>}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-3">Personlighed</h3>
                                <div className="flex flex-wrap gap-2">
                                    {tags.length > 0 ? tags.map(t => <span key={t.id} className="tag-personality">{t.name}</span>) : <p className="text-sm text-text-secondary">Ingen tags valgt.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
            </main>
            
            <footer className="sticky bottom-0 bg-white dark:bg-dark-surface border-t p-4 z-10">
                <div className="max-w-xl mx-auto">
                    {renderActionButton()}
                </div>
            </footer>
             <style>{`.btn-primary { display: inline-flex; align-items: center; background-color: #006B76; color: white; font-weight: 700; padding: 0.75rem 1rem; border-radius: 9999px; }
                .btn-secondary { display: inline-flex; align-items: center; background-color: #F3F4F6; color: #374151; font-weight: 600; padding: 0.75rem 1rem; border-radius: 9999px; font-size: 0.875rem; }
                .dark .btn-secondary { background-color: #374151; color: #D1D5DB; }
                .tag-interest { background-color: #DBEAFE; color: #1E40AF; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }
                .dark .tag-interest { background-color: #1E3A8A; color: #BFDBFE; }
                .tag-personality { background-color: #E0E7FF; color: #4338CA; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }
                .dark .tag-personality { background-color: #3730A3; color: #C7D2FE; }
            `}</style>
        </div>
    );
};

export default UserProfilePage;
