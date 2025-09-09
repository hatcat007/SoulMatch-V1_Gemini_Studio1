import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, UserPlus, BrainCircuit, Heart, Star, Info, Check, MapPin } from 'lucide-react';
import { supabase } from '../services/supabase';
import { calculateMatches, MatchDetails, MatchResults } from '../services/matchingService';
import type { User, Friendship, Interest, PersonalityTag } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import { fetchPrivateFile } from '../services/s3Service';
import { motion, AnimatePresence } from 'framer-motion';

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

const MatchCard: React.FC<{ match: MatchDetails, onAddFriend: (id: number) => void, isRequestSent: boolean, matchType: 'combined' | 'personality' | 'interests' }> = ({ match, onAddFriend, isRequestSent, matchType }) => {
    const { user, scores, commonalities } = match;

    const primaryScore = useMemo(() => {
        switch (matchType) {
            case 'personality':
                return { score: scores.personality, label: 'Personlighed' };
            case 'interests':
                return { score: scores.interestAndTagPercent, label: 'Interesse Match' };
            case 'combined':
            default:
                return { score: scores.combined, label: 'Match' };
        }
    }, [matchType, scores]);


    return (
        <motion.div 
            className="bg-white dark:bg-dark-surface rounded-2xl shadow-md overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="p-4">
                <div className="flex items-start space-x-4">
                    <PrivateImage src={user.avatar_url} alt={user.name} className="w-20 h-20 rounded-full object-cover border-2 border-white dark:border-dark-surface" />
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">{user.name}, {user.age}</h3>
                                {user.location && <p className="text-xs text-text-secondary dark:text-dark-text-secondary flex items-center"><MapPin size={12} className="mr-1"/>{user.location}</p>}
                            </div>
                            {user.personality_type && <span className="text-sm font-bold bg-primary-light dark:bg-primary/20 text-primary px-2 py-1 rounded-md">{user.personality_type}</span>}
                        </div>
                        
                        {/* Score breakdown */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                            <div className="flex items-center"><Star size={14} className="mr-1.5 text-yellow-500"/><span className="font-semibold">{primaryScore.score}%</span>&nbsp;{primaryScore.label}</div>
                            <div className="flex items-center"><BrainCircuit size={14} className="mr-1.5 text-purple-500"/><span className="font-semibold">{scores.personality}%</span>&nbsp;Personlighed</div>
                            <div className="flex items-center"><Heart size={14} className="mr-1.5 text-red-500"/><span className="font-semibold">{scores.interestCount}</span>&nbsp;Interesser</div>
                            <div className="flex items-center"><Info size={14} className="mr-1.5 text-blue-500"/><span className="font-semibold">{scores.tagCount}</span>&nbsp;Tags</div>
                        </div>
                    </div>
                </div>

                {commonalities.interests.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border">
                         <h4 className="text-xs font-bold uppercase text-text-secondary dark:text-dark-text-secondary mb-2">Fælles interesser</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {commonalities.interests.slice(0, 5).map(interest => (
                                <span key={interest.id} className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded-full text-xs font-medium">{interest.name}</span>
                            ))}
                        </div>
                    </div>
                )}

                 {commonalities.tags.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border">
                         <h4 className="text-xs font-bold uppercase text-text-secondary dark:text-dark-text-secondary mb-2">Fælles personlighed</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {commonalities.tags.slice(0, 5).map(tag => (
                                <span key={tag.id} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-medium">{tag.name}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-surface-light">
                 {isRequestSent ? (
                    <button disabled className="w-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold py-2 px-4 rounded-full text-sm transition-colors cursor-not-allowed">
                        <Check size={16} className="mr-2"/> Anmodning sendt
                    </button>
                ) : (
                    <button onClick={() => onAddFriend(user.id)} className="w-full flex items-center justify-center bg-primary text-white font-bold py-2 px-4 rounded-full text-sm hover:bg-primary-dark transition-colors">
                        <UserPlus size={16} className="mr-2"/> Send venneanmodning
                    </button>
                )}
            </div>
        </motion.div>
    );
};


const SoulmatchesPage: React.FC = () => {
    const navigate = useNavigate();
    const [matchType, setMatchType] = useState<'combined' | 'personality' | 'interests'>('combined');
    
    const [matches, setMatches] = useState<MatchResults | null>(null);
    const [loading, setLoading] = useState(true);
    const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const calculateAndSetMatches = useCallback(async (userId: number) => {
        setLoading(true);

        const { data: allUsersData, error: usersError } = await supabase
            .from('users')
            .select(`*, interests:user_interests(interest:interests(id, name, category_id)), dimensions:user_personality_dimensions(dimension, dominant_trait, score), personality_tags:user_personality_tags(tag:personality_tags(id, name, category_id))`)
            .eq('personality_test_completed', true);
        
        if (usersError) { console.error("Error fetching users for matching:", usersError); setLoading(false); return; }

        const { data: friendships } = await supabase.from('friends').select('user_id_1, user_id_2').or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
        const existingRelations = new Set(friendships?.map(f => f.user_id_1 === userId ? f.user_id_2 : f.user_id_1));
        existingRelations.add(userId);
        
        const mapUserData = (user: any) => ({
            ...user,
            interests: user.interests.map((i: any) => i.interest).filter(Boolean),
            dimensions: user.dimensions || [],
            personality_tags: user.personality_tags.map((t: any) => t.tag).filter(Boolean),
        });

        const currentUserData = allUsersData.find(u => u.id === userId);
        if (!currentUserData) { setLoading(false); return; }

        const currentUser = mapUserData(currentUserData);
        const potentialMatches = allUsersData.filter(u => !existingRelations.has(u.id)).map(mapUserData);
        
        const results = calculateMatches(currentUser, potentialMatches);
        setMatches(results);
        setLoading(false);
    }, []);

    useEffect(() => {
        const init = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) { navigate('/login'); return; }
            const { data: userProfile } = await supabase.from('users').select('id').eq('auth_id', authUser.id).single();
            if (userProfile) {
                setCurrentUserId(userProfile.id);
                calculateAndSetMatches(userProfile.id);
            } else {
                setLoading(false);
            }
        };
        init();
    }, [navigate, calculateAndSetMatches]);


    const handleSendFriendRequest = async (friendId: number) => {
        if (!currentUserId) return;
        setSentRequests(prev => new Set(prev).add(friendId));
        const u1 = Math.min(currentUserId, friendId);
        const u2 = Math.max(currentUserId, friendId);
        await supabase.from('friends').insert({ user_id_1: u1, user_id_2: u2, action_user_id: currentUserId, status: 'pending' });
    };

    const subNavItems = [
        { id: 'combined', label: 'Kombineret', icon: Star },
        { id: 'personality', label: 'Personlighed', icon: BrainCircuit },
        { id: 'interests', label: 'Interesser', icon: Heart }
    ];

    const currentList = matches ? matches[matchType] : [];

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage"><ArrowLeft size={24} /></button>
                <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Find dine SoulMatches</h1>
                <div className="w-8"></div>
            </header>
            
            <nav className="flex-shrink-0 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky top-[65px] z-10">
                 <div className="flex justify-around">
                    {subNavItems.map(item => {
                        const Icon = item.icon;
                        return (
                            <button key={item.id} onClick={() => setMatchType(item.id as any)} className={`flex-1 py-3 text-center text-sm font-semibold transition-colors flex items-center justify-center border-b-2 ${matchType === item.id ? 'text-primary border-primary' : 'text-text-secondary border-transparent'}`}>
                                <Icon size={16} className="mr-1.5" /> {item.label}
                            </button>
                        )
                    })}
                </div>
            </nav>
            
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <AnimatePresence>
                {loading ? (
                    <div className="text-center p-8 text-text-secondary flex flex-col items-center"><Loader2 size={32} className="animate-spin text-primary mb-4" /><p className="font-semibold">Beregner de bedste matches til dig...</p></div>
                ) : currentList.length === 0 ? (
                    <div className="text-center p-8 text-text-secondary"><p>Vi kunne ikke finde nye matches lige nu.</p><p className="text-sm">Prøv igen senere!</p></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentList.map(match => (
                           <MatchCard
                                key={match.user.id}
                                match={match}
                                onAddFriend={handleSendFriendRequest}
                                isRequestSent={sentRequests.has(match.user.id)}
                                matchType={matchType}
                            />
                        ))}
                    </div>
                )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default SoulmatchesPage;