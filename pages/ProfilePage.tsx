import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Calendar, Users, LogOut, Shield, MapPin, Loader2, Image as ImageIcon, Edit, Save, BrainCircuit, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import type { User, Interest, PersonalityTag, UserTrait, InterestCategory, PersonalityTagCategory } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import PersonalityRadarChart from '../components/PersonalityRadarChart';
import { fetchPrivateFile } from '../services/s3Service';
import TagSelector from '../components/TagSelector';
import { generateProfileDescription } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';


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
        return <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light rounded-full`}><Loader2 className="animate-spin text-gray-400" size={16}/></div>;
    }
    if(!imageUrl) {
        return <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light rounded-full`}><ImageIcon className="text-gray-400" size={16}/></div>;
    }

    return <img src={imageUrl} alt={alt} className={className} />;
};

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { user: authUser, loading: authLoading, refetchUserProfile } = useAuth();
    
    // Data state
    const [user, setUser] = useState<User | null>(null);
    const [interests, setInterests] = useState<Interest[]>([]);
    const [personalityTags, setPersonalityTags] = useState<PersonalityTag[]>([]);
    const [traits, setTraits] = useState<UserTrait[]>([]);
    
    // For editing
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ bio: '', name: '', age: '', location: '' });
    const [allInterests, setAllInterests] = useState<Interest[]>([]);
    const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
    const [allPersonalityTags, setAllPersonalityTags] = useState<PersonalityTag[]>([]);
    const [personalityTagCategories, setPersonalityTagCategories] = useState<PersonalityTagCategory[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
    const [selectedPersonalityTags, setSelectedPersonalityTags] = useState<PersonalityTag[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    // AI Description state
    const [aiDescription, setAiDescription] = useState<string | null>(null);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

    const [loading, setLoading] = useState(true);
    
    const fetchProfileData = useCallback(async () => {
        if (!authUser) {
            if (!authLoading) navigate('/login');
            return;
        }
        
        setLoading(true);

        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                user_interests(interest:interests(*, category:interest_categories(*))),
                user_personality_tags(tag:personality_tags(*, category:personality_tag_categories(*))),
                user_traits(*)
            `)
            .eq('id', authUser.id)
            .single();

        if (error || !data) {
            console.error("Error fetching full user profile:", error);
            setLoading(false);
            return;
        }
        
        const fetchedUser: User = {
            ...data,
            interests: data.user_interests.map((i: any) => i.interest).filter(Boolean),
            personality_tags: data.user_personality_tags.map((t: any) => t.tag).filter(Boolean),
        };
        
        setUser(fetchedUser);
        setInterests(fetchedUser.interests || []);
        setPersonalityTags(fetchedUser.personality_tags || []);
        setTraits(data.user_traits || []);

        // For editing mode, fetch all possible tags and categories
        const { data: iCatData } = await supabase.from('interest_categories').select('*').order('name');
        const { data: iData } = await supabase.from('interests').select('*');
        const { data: pCatData } = await supabase.from('personality_tag_categories').select('*').order('name');
        const { data: pData } = await supabase.from('personality_tags').select('*');

        setAllInterests(iData || []);
        setInterestCategories(iCatData || []);
        setAllPersonalityTags(pData || []);
        setPersonalityTagCategories(pCatData || []);
        
        setLoading(false);
    }, [authUser, authLoading, navigate]);

    useEffect(() => {
        if (!authLoading) {
            fetchProfileData();
        }
    }, [authLoading, fetchProfileData]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const handleEditToggle = () => {
        if (!user) return;
        if (!isEditing) {
            setFormData({ 
                bio: user.bio || '',
                name: user.name || '',
                age: user.age?.toString() || '',
                location: user.location || '',
            });
            setSelectedInterests(interests);
            setSelectedPersonalityTags(personalityTags);
        }
        setIsEditing(!isEditing);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSaving(true);

        // Update basic info
        await supabase.from('users').update({ 
            bio: formData.bio,
            name: formData.name,
            age: parseInt(formData.age, 10) || user.age,
            location: formData.location
        }).eq('id', user.id);

        // Sync interests
        await supabase.from('user_interests').delete().eq('user_id', user.id);
        const interestLinks = selectedInterests.map(i => ({ user_id: user.id, interest_id: i.id }));
        if (interestLinks.length > 0) await supabase.from('user_interests').insert(interestLinks);

        // Sync personality tags
        await supabase.from('user_personality_tags').delete().eq('user_id', user.id);
        const tagLinks = selectedPersonalityTags.map(t => ({ user_id: user.id, tag_id: t.id }));
        if (tagLinks.length > 0) await supabase.from('user_personality_tags').insert(tagLinks);
        
        await fetchProfileData(); // Refetch all data to update view
        refetchUserProfile(); // Also refetch the global user profile
        setIsSaving(false);
        setIsEditing(false);
    };

    const handleGenerateDescription = async () => {
        if (!user || traits.length === 0) return;
        setIsGeneratingDescription(true);
        setAiDescription(null);
        try {
            const description = await generateProfileDescription({
                bio: user.bio || '',
                personality_type: user.personality_type || '',
                traits,
                interests,
                tags: personalityTags
            });
            setAiDescription(description);
        } catch (e) {
            console.error("Error generating AI description:", e);
            setAiDescription("Kunne ikke generere en beskrivelse. Prøv venligst igen.");
        } finally {
            setIsGeneratingDescription(false);
        }
    };
    
    if (loading || authLoading) {
        return <LoadingScreen message="Indlæser profil..." />;
    }

    if (!user) {
        return (
            <div className="p-4 text-center">
                <p>Kunne ikke indlæse brugerprofil.</p>
                <Link to="/login" className="text-primary mt-4">Log ind</Link>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
                <div className="w-8"></div>
                <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Profil</h1>
                <Link to="/settings" className="p-2 -mr-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
                    <Settings size={24} />
                </Link>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                <div className="max-w-3xl mx-auto">
                    {/* Profile Header */}
                    <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm flex flex-col items-center text-center">
                        <div className="relative mb-4">
                            <PrivateImage 
                                src={user.avatar_url} 
                                alt={user.name} 
                                className="w-28 h-28 rounded-full object-cover ring-4 ring-white dark:ring-dark-surface" 
                            />
                            {user.online && <span className="absolute bottom-1 right-1 block h-5 w-5 rounded-full bg-green-400 border-2 border-white dark:border-dark-surface"></span>}
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{user.name}, {user.age}</h2>
                        {user.location && <p className="text-text-secondary dark:text-dark-text-secondary mt-1 flex items-center"><MapPin size={14} className="mr-1.5"/>{user.location}</p>}
                        
                        <div className="mt-4 flex space-x-2 w-full">
                            <Link to="/my-events" className="flex-1 bg-gray-100 dark:bg-dark-surface-light text-text-primary dark:text-dark-text-primary font-bold py-2 px-4 rounded-full text-sm flex items-center justify-center hover:bg-gray-200 dark:hover:bg-dark-border">
                                 <Calendar size={16} className="mr-1.5"/> Mine Events
                            </Link>
                             <Link to="/friends" className="flex-1 bg-gray-100 dark:bg-dark-surface-light text-text-primary dark:text-dark-text-primary font-bold py-2 px-4 rounded-full text-sm flex items-center justify-center hover:bg-gray-200 dark:hover:bg-dark-border">
                                <Users size={16} className="mr-1.5"/> Venner
                            </Link>
                            <button onClick={handleEditToggle} className="flex-shrink-0 bg-primary text-white font-bold p-2 rounded-full text-sm">
                                {isEditing ? <X size={20}/> : <Edit size={20}/>}
                            </button>
                        </div>
                    </section>

                    {isEditing ? (
                        /* EDITING VIEW */
                        <div className="mt-6 space-y-6">
                             <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm space-y-4">
                                <h3 className="font-bold text-text-primary dark:text-dark-text-primary">Rediger basisoplysninger</h3>
                                <div>
                                    <label htmlFor="name-edit" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn</label>
                                    <input id="name-edit" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 bg-gray-50 dark:bg-dark-surface-light border rounded-md"/>
                                </div>
                                <div>
                                    <label htmlFor="age-edit" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Alder</label>
                                    <input id="age-edit" type="number" value={formData.age} onChange={e => setFormData(p => ({...p, age: e.target.value}))} className="w-full p-2 bg-gray-50 dark:bg-dark-surface-light border rounded-md"/>
                                </div>
                                <div>
                                    <label htmlFor="location-edit" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Lokation</label>
                                    <input id="location-edit" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))} className="w-full p-2 bg-gray-50 dark:bg-dark-surface-light border rounded-md"/>
                                </div>
                                <div>
                                    <label htmlFor="bio-edit" className="font-bold text-text-primary dark:text-dark-text-primary mb-2 block">Om mig</label>
                                    <textarea id="bio-edit" value={formData.bio} onChange={e => setFormData(p => ({...p, bio: e.target.value}))} rows={4} className="w-full p-2 bg-gray-50 dark:bg-dark-surface-light border rounded-md"></textarea>
                                </div>
                             </div>
                             <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm">
                                <TagSelector title="Rediger Interesser" categories={interestCategories} allTags={allInterests} selectedTags={selectedInterests} onToggleTag={tag => setSelectedInterests(prev => prev.some(i => i.id === tag.id) ? prev.filter(i => i.id !== tag.id) : [...prev, tag as Interest])} containerHeight="h-[400px]" />
                            </div>
                            <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm">
                                <TagSelector title="Rediger Personlighed" categories={personalityTagCategories} allTags={allPersonalityTags} selectedTags={selectedPersonalityTags} onToggleTag={tag => setSelectedPersonalityTags(prev => prev.some(t => t.id === tag.id) ? prev.filter(t => t.id !== tag.id) : [...prev, tag as PersonalityTag])} containerHeight="h-[400px]" />
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-200 dark:bg-dark-surface-light font-bold py-3 px-4 rounded-full">Annuller</button>
                                <button onClick={handleSaveProfile} disabled={isSaving} className="flex-1 bg-primary text-white font-bold py-3 px-4 rounded-full flex items-center justify-center disabled:opacity-50">
                                    {isSaving && <Loader2 className="animate-spin mr-2"/>} Gem
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* DISPLAY VIEW */
                        <>
                            {user.bio && (
                                <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm mt-6">
                                    <h3 className="font-bold text-text-primary dark:text-dark-text-primary mb-2">Om mig</h3>
                                    <p className="text-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap">{user.bio}</p>
                                </section>
                            )}
                            {interests.length > 0 && (
                                <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm mt-6">
                                    <h3 className="font-bold text-text-primary dark:text-dark-text-primary mb-3">Interesser</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {interests.map(interest => (<span key={interest.id} className="bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light px-3 py-1.5 rounded-full text-sm font-medium">{interest.name}</span>))}
                                    </div>
                                </section>
                            )}
                            {personalityTags.length > 0 && (
                                <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm mt-6">
                                    <h3 className="font-bold text-text-primary dark:text-dark-text-primary mb-3">Personlighed</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {personalityTags.map(tag => (<span key={tag.id} className="bg-gray-100 dark:bg-dark-surface-light text-text-secondary dark:text-dark-text-secondary px-3 py-1.5 rounded-full text-sm font-medium">{tag.name}</span>))}
                                    </div>
                                </section>
                            )}
                            
                            {traits.length > 0 && (
                                <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm mt-6">
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Personlighed</h3>
                                        <p className="text-2xl font-bold text-primary">{user.personality_type}</p>
                                    </div>
                                    <div className="min-h-[350px]">
                                        <PersonalityRadarChart traits={traits} />
                                    </div>
                                    <div className="text-center mt-4">
                                         <button onClick={handleGenerateDescription} disabled={isGeneratingDescription} className="bg-primary text-white font-semibold py-2 px-5 rounded-full flex items-center justify-center mx-auto disabled:opacity-70">
                                            {isGeneratingDescription ? <Loader2 className="animate-spin" /> : <><BrainCircuit size={18} className="mr-2"/> Beskriv mig</>}
                                        </button>
                                        <AnimatePresence>
                                        {aiDescription && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-4 text-left p-4 bg-primary-light/50 dark:bg-primary/10 rounded-lg text-text-secondary dark:text-dark-text-secondary"
                                            >
                                               <p>{aiDescription}</p>
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                    
                    {user.is_admin && !isEditing && (
                         <section className="mt-6">
                             <Link to="/admin" className="w-full flex items-center justify-center bg-red-100 text-red-700 font-bold py-3 px-4 rounded-lg text-lg hover:bg-red-200 transition duration-300">
                                <Shield className="w-5 h-5 mr-3"/>
                                Admin Panel
                            </Link>
                        </section>
                    )}

                    {!isEditing && (
                        <section className="mt-6">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center bg-white dark:bg-dark-surface text-red-500 font-bold py-3 px-4 rounded-lg text-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition duration-300 shadow-sm border border-gray-200 dark:border-dark-border"
                            >
                                <LogOut className="w-5 h-5 mr-3"/>
                                Log ud
                            </button>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;