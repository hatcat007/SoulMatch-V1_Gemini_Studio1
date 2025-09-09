import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Calendar, Users, LogOut, Shield, MapPin, Loader2, Image as ImageIcon, Edit, Save, BrainCircuit, X, Trash2, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import type { User, Interest, PersonalityTag, UserPersonalityDimension, InterestCategory, PersonalityTagCategory, UserAiDescription } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import PersonalityDimensionChart from '../components/PersonalityDimensionChart';
import { uploadFile, fetchPrivateFile } from '../services/s3Service';
import TagSelector from '../components/TagSelector';
import { generateProfileDescription } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [displayUrl, setDisplayUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let objectUrlToRevoke: string | null = null;
        let isMounted = true;

        const processUrl = async () => {
            setIsLoading(true);
            if (!src) {
                if(isMounted) { setDisplayUrl(''); setIsLoading(false); }
                return;
            }

            if (src.startsWith('blob:') || src.startsWith('data:')) {
                 if (isMounted) { setDisplayUrl(src); setIsLoading(false); }
                 return;
            }
            
            try {
                const url = await fetchPrivateFile(src);
                if (isMounted) {
                    if (url.startsWith('blob:')) objectUrlToRevoke = url;
                    setDisplayUrl(url);
                }
            } catch (e) {
                console.error("Failed to process image source:", e);
                if(isMounted) setDisplayUrl('');
            } finally {
                if(isMounted) setIsLoading(false);
            }
        };

        processUrl();

        return () => {
            isMounted = false;
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        };
    }, [src]);
    
    if(isLoading) {
        return <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light rounded-full`}><Loader2 className="animate-spin text-gray-400" size={24}/></div>;
    }
    if(!displayUrl) {
        return <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light rounded-full`}><ImageIcon className="text-gray-400" size={24}/></div>;
    }
    return <img src={displayUrl} alt={alt} className={className} />;
};


const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { user: authUser, loading: authLoading, refetchUserProfile } = useAuth();
    
    // Data state
    const [user, setUser] = useState<User | null>(null);
    const [interests, setInterests] = useState<Interest[]>([]);
    const [personalityTags, setPersonalityTags] = useState<PersonalityTag[]>([]);
    const [personalityDimensions, setPersonalityDimensions] = useState<UserPersonalityDimension[]>([]);
    const [savedAiDescriptions, setSavedAiDescriptions] = useState<UserAiDescription[]>([]);
    
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
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
    const [newAvatarPreview, setNewAvatarPreview] = useState<string | null>(null);
    
    // AI Description state
    const [aiDescription, setAiDescription] = useState<string | null>(null);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isSavingDescription, setIsSavingDescription] = useState(false);

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
                personality_dimensions:user_personality_dimensions(*),
                user_ai_descriptions(*)
            `)
            .order('created_at', { foreignTable: 'user_ai_descriptions', ascending: false })
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
            ai_descriptions: data.user_ai_descriptions,
            personality_dimensions: data.personality_dimensions,
        };
        
        setUser(fetchedUser);
        setInterests(fetchedUser.interests || []);
        setPersonalityTags(fetchedUser.personality_tags || []);
        setPersonalityDimensions(fetchedUser.personality_dimensions || []);
        setSavedAiDescriptions(data.user_ai_descriptions || []);

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
        } else {
            setNewAvatarFile(null);
            setNewAvatarPreview(null);
        }
        setIsEditing(!isEditing);
    };
    
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNewAvatarFile(file);
            if (newAvatarPreview) {
                URL.revokeObjectURL(newAvatarPreview);
            }
            setNewAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSaving(true);
        let newAvatarUrl = user.avatar_url;

        try {
            if (newAvatarFile) {
                newAvatarUrl = await uploadFile(newAvatarFile);
            }

            const updates: Partial<User> = {
                bio: formData.bio, name: formData.name, age: parseInt(formData.age, 10) || user.age,
                location: formData.location, avatar_url: newAvatarUrl,
            };

            const { error: userUpdateError } = await supabase.from('users').update(updates).eq('id', user.id);
            if (userUpdateError) throw userUpdateError;

            await supabase.from('user_interests').delete().eq('user_id', user.id);
            const interestLinks = selectedInterests.map(i => ({ user_id: user.id, interest_id: i.id }));
            if (interestLinks.length > 0) await supabase.from('user_interests').insert(interestLinks);

            await supabase.from('user_personality_tags').delete().eq('user_id', user.id);
            const tagLinks = selectedPersonalityTags.map(t => ({ user_id: user.id, tag_id: t.id }));
            if (tagLinks.length > 0) await supabase.from('user_personality_tags').insert(tagLinks);
            
            setNewAvatarFile(null);
            setNewAvatarPreview(null);
            await fetchProfileData();
            refetchUserProfile();
            setIsEditing(false);
        } catch (err: any) {
            console.error("Error saving profile:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateDescription = async () => {
        if (!user || personalityDimensions.length === 0) return;
        setIsGeneratingDescription(true);
        setAiDescription(null);
        try {
            const description = await generateProfileDescription({
                bio: user.bio || '',
                personality_type: user.personality_type || '',
                dimensions: personalityDimensions,
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
    
    const handleSaveAiDescription = async () => {
        if (!aiDescription || !user) return;
        setIsSavingDescription(true);
        const { data, error } = await supabase
            .from('user_ai_descriptions')
            .insert({ user_id: user.id, description: aiDescription })
            .select()
            .single();

        if (error) {
            console.error("Error saving AI description:", error);
        } else if (data) {
            setSavedAiDescriptions(prev => [data, ...prev]);
            setAiDescription(null);
        }
        setIsSavingDescription(false);
    };

    const handleDeleteAiDescription = async (descriptionId: number) => {
        const originalDescriptions = savedAiDescriptions;
        setSavedAiDescriptions(prev => prev.filter(d => d.id !== descriptionId));
        const { error } = await supabase.from('user_ai_descriptions').delete().eq('id', descriptionId);
        if (error) {
            setSavedAiDescriptions(originalDescriptions);
            console.error("Error deleting AI description:", error);
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
                <Link to="/settings" className="p-2 -mr-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary"><Settings size={24} /></Link>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-3xl mx-auto space-y-6">
                     <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm flex flex-col items-center text-center">
                        <div className="relative mb-4 group">
                             <PrivateImage 
                                src={newAvatarPreview || user.avatar_url}
                                alt={user.name} 
                                className="w-36 h-36 rounded-full object-cover ring-4 ring-white dark:ring-dark-surface" 
                            />
                             {isEditing && (
                                <>
                                    <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                                    <button type="button" onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 w-full h-full bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera size={32} />
                                    </button>
                                </>
                            )}
                            {user.online && !isEditing && <span className="absolute bottom-2 right-2 block h-5 w-5 rounded-full bg-green-400 border-2 border-white dark:border-dark-surface"></span>}
                        </div>
                        <div className="w-full max-w-xs">
                            {isEditing ? (
                                <div className="space-y-2">
                                    <input value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 text-center text-2xl font-bold bg-gray-50 dark:bg-dark-surface-light border rounded-md"/>
                                    <input value={formData.age} type="number" onChange={e => setFormData(p => ({...p, age: e.target.value}))} className="w-full p-2 text-center bg-gray-50 dark:bg-dark-surface-light border rounded-md"/>
                                    <input value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))} className="w-full p-2 text-center bg-gray-50 dark:bg-dark-surface-light border rounded-md"/>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{user.name}, {user.age}</h2>
                                    {user.location && <p className="text-text-secondary dark:text-dark-text-secondary mt-1 flex items-center justify-center"><MapPin size={14} className="mr-1.5"/>{user.location}</p>}
                                </>
                            )}
                        </div>
                        <div className="mt-4 flex space-x-2 w-full">
                            {isEditing ? (
                                <>
                                <button onClick={handleEditToggle} className="flex-1 bg-gray-200 dark:bg-dark-surface-light font-bold py-2 px-4 rounded-full">Annuller</button>
                                <button onClick={handleSaveProfile} disabled={isSaving} className="flex-1 bg-primary text-white font-bold py-2 px-4 rounded-full flex items-center justify-center disabled:opacity-50">
                                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>} Gem
                                </button>
                                </>
                            ) : (
                                <>
                                <Link to="/my-events" className="flex-1 bg-gray-100 dark:bg-dark-surface-light text-text-primary dark:text-dark-text-primary font-bold py-2 px-4 rounded-full text-sm flex items-center justify-center hover:bg-gray-200 dark:hover:bg-dark-border"><Calendar size={16} className="mr-1.5"/> Mine Events</Link>
                                <Link to="/friends" className="flex-1 bg-gray-100 dark:bg-dark-surface-light text-text-primary dark:text-dark-text-primary font-bold py-2 px-4 rounded-full text-sm flex items-center justify-center hover:bg-gray-200 dark:hover:bg-dark-border"><Users size={16} className="mr-1.5"/> Venner</Link>
                                <button onClick={handleEditToggle} className="flex-shrink-0 bg-primary text-white font-bold p-2.5 rounded-full"><Edit size={20}/></button>
                                </>
                            )}
                        </div>
                    </section>
                    
                    {isEditing ? (
                        <>
                         <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm"><label htmlFor="bio-edit" className="font-bold text-text-primary dark:text-dark-text-primary mb-2 block">Om mig</label><textarea id="bio-edit" value={formData.bio} onChange={e => setFormData(p => ({...p, bio: e.target.value}))} rows={4} className="w-full p-2 bg-gray-50 dark:bg-dark-surface-light border rounded-md"></textarea></section>
                         <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm"><TagSelector title="Rediger Interesser" categories={interestCategories} allTags={allInterests} selectedTags={selectedInterests} onToggleTag={tag => setSelectedInterests(prev => prev.some(i => i.id === tag.id) ? prev.filter(i => i.id !== tag.id) : [...prev, tag as Interest])} containerHeight="h-[400px]" /></section>
                         <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm"><TagSelector title="Rediger Personlighed" categories={personalityTagCategories} allTags={allPersonalityTags} selectedTags={selectedPersonalityTags} onToggleTag={tag => setSelectedPersonalityTags(prev => prev.some(t => t.id === tag.id) ? prev.filter(t => t.id !== tag.id) : [...prev, tag as PersonalityTag])} containerHeight="h-[400px]" /></section>
                        </>
                    ) : (
                        <>
                            {user.bio && <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm"><h3 className="font-bold text-text-primary dark:text-dark-text-primary mb-2">Om mig</h3><p className="text-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap">{user.bio}</p></section>}
                            {interests.length > 0 && <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm"><h3 className="font-bold text-text-primary dark:text-dark-text-primary mb-3">Interesser</h3><div className="flex flex-wrap gap-2">{interests.map(interest => (<span key={interest.id} className="bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light px-3 py-1.5 rounded-full text-sm font-medium">{interest.name}</span>))}</div></section>}
                            {personalityTags.length > 0 && <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm"><h3 className="font-bold text-text-primary dark:text-dark-text-primary mb-3">Personlighed</h3><div className="flex flex-wrap gap-2">{personalityTags.map(tag => (<span key={tag.id} className="bg-gray-100 dark:bg-dark-surface-light text-text-secondary dark:text-dark-text-secondary px-3 py-1.5 rounded-full text-sm font-medium">{tag.name}</span>))}</div></section>}
                            {personalityDimensions.length > 0 && (
                                <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm">
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Din Personlighedstype</h3>
                                        <p className="text-5xl font-bold text-primary mt-1">{user.personality_type}</p>
                                    </div>
                                    <PersonalityDimensionChart dimensions={personalityDimensions} />
                                    <div className="text-center mt-12"><button onClick={handleGenerateDescription} disabled={isGeneratingDescription} className="bg-primary text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center mx-auto disabled:opacity-70">{isGeneratingDescription ? <Loader2 className="animate-spin" /> : <><BrainCircuit size={18} className="mr-2"/> Beskriv mig</>}</button>
                                        <AnimatePresence>
                                        {aiDescription && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 text-left p-4 bg-primary-light/50 dark:bg-primary/10 rounded-lg text-text-secondary dark:text-dark-text-secondary">
                                               <p className="whitespace-pre-wrap">{aiDescription}</p>
                                               <div className="mt-4 flex justify-end"><button onClick={handleSaveAiDescription} disabled={isSavingDescription} className="flex items-center bg-green-500 text-white font-semibold py-2 px-4 rounded-full text-sm hover:bg-green-600 transition disabled:opacity-70">{isSavingDescription ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}Gem</button></div>
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </div>
                                </section>
                            )}
                            {savedAiDescriptions.length > 0 && (
                                <section className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm"><h3 className="font-bold text-text-primary dark:text-dark-text-primary mb-3">Beskrivelser fra min AI-analyse</h3><div className="space-y-4">{savedAiDescriptions.map(desc => (<div key={desc.id} className="bg-gray-50 dark:bg-dark-surface-light p-4 rounded-lg relative group"><p className="text-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap">{desc.description}</p><button onClick={() => handleDeleteAiDescription(desc.id)} className="absolute top-2 right-2 p-1.5 bg-white/50 dark:bg-dark-surface/50 rounded-full text-gray-500 hover:text-red-500 hover:bg-white dark:hover:bg-dark-surface opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Slet beskrivelse"><Trash2 size={14} /></button></div>))}</div></section>
                            )}
                            {user.is_admin && <section><Link to="/admin" className="w-full flex items-center justify-center bg-red-100 text-red-700 font-bold py-3 px-4 rounded-lg text-lg hover:bg-red-200 transition duration-300"><Shield className="w-5 h-5 mr-3"/>Admin Panel</Link></section>}
                            <section><button onClick={handleLogout} className="w-full flex items-center justify-center bg-white dark:bg-dark-surface text-red-500 font-bold py-3 px-4 rounded-lg text-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition duration-300 shadow-sm border border-gray-200 dark:border-dark-border"><LogOut className="w-5 h-5 mr-3"/>Log ud</button></section>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;
