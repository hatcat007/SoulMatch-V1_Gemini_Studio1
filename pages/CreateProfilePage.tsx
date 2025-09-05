import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { Interest, InterestCategory, PersonalityTag, PersonalityTagCategory } from '../types';
import { X, Plus, Loader2, Image as ImageIcon, Search, ChevronDown } from 'lucide-react';
import { uploadFile } from '../services/s3Service';
import { motion, AnimatePresence } from 'framer-motion';

const INTEREST_GOAL = 35;
const TAGS_PER_PAGE = 10;

interface CreateProfilePageProps {
  onProfileCreated: () => void;
}

const SmartImage: React.FC<{ src: string; alt: string; className: string; }> = ({ src, alt, className }) => {
    const [displayUrl, setDisplayUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        let objectUrlToRevoke: string | null = null;
        if (src.startsWith('blob:')) {
            setDisplayUrl(src);
            setIsLoading(false);
        } else {
            setIsLoading(true);
            uploadFile(new File([], src)).then(url => {
                objectUrlToRevoke = url;
                setDisplayUrl(url);
            }).finally(() => setIsLoading(false));
        }
        return () => { if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke); };
    }, [src]);

    if (isLoading) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light rounded-lg flex items-center justify-center`}><Loader2 className="animate-spin text-gray-400" size={24} /></div>;
    if (!displayUrl) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light rounded-lg flex items-center justify-center`}><ImageIcon className="text-gray-400" size={24} /></div>;
    return <img src={displayUrl} alt={alt} className={className} />;
};

const TagSelector: React.FC<{
    title: string;
    categories: (InterestCategory | PersonalityTagCategory)[];
    allTags: (Interest | PersonalityTag)[];
    selectedTags: (Interest | PersonalityTag)[];
    onToggleTag: (tag: Interest | PersonalityTag) => void;
    goal?: number;
}> = ({ title, categories, allTags, selectedTags, onToggleTag, goal }) => {
    const [activeCategory, setActiveCategory] = useState<(InterestCategory | PersonalityTagCategory) | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(TAGS_PER_PAGE);

    useEffect(() => {
        if (!activeCategory && categories.length > 0) {
            setActiveCategory(categories[0]);
        }
    }, [categories, activeCategory]);

    const filteredTags = useMemo(() => {
        let tags = allTags;
        if (searchTerm) {
            tags = tags.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        } else if (activeCategory) {
            tags = tags.filter(i => i.category_id === activeCategory.id);
        }
        return tags;
    }, [allTags, activeCategory, searchTerm]);
    
    const progress = goal ? Math.min(100, (selectedTags.length / goal) * 100) : 0;

    return (
        <div className="flex flex-col h-[500px] w-full">
            <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-3">{title}</h2>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-200 dark:border-dark-border rounded-lg p-3 overflow-hidden">
                <div className="col-span-1 flex flex-col space-y-1 overflow-y-auto pr-1 scrollbar-hide">
                    <div className="relative mb-1">
                        <input type="text" placeholder="Søg..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setVisibleCount(TAGS_PER_PAGE);}} className="w-full text-sm pl-8 pr-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-surface-light"/>
                        <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
                    </div>
                    {categories.map(cat => {
                        const count = selectedTags.filter(i => i.category_id === cat.id).length;
                        return (
                            <button key={cat.id} type="button" onClick={() => { setActiveCategory(cat); setSearchTerm(''); setVisibleCount(TAGS_PER_PAGE); }}
                                className={`w-full text-left text-sm font-semibold p-2 rounded-md flex justify-between items-center transition-colors ${activeCategory?.id === cat.id && !searchTerm ? 'bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-light'}`}>
                                <span>{cat.name}</span>
                                {count > 0 && <span className="bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{count}</span>}
                            </button>
                        );
                    })}
                </div>
                <div className="col-span-1 md:col-span-2 overflow-y-auto flex flex-wrap gap-2 content-start pr-1 scrollbar-hide">
                    <AnimatePresence>
                        {filteredTags.slice(0, visibleCount).map(tag => {
                            const isSelected = selectedTags.some(i => i.id === tag.id);
                            return (
                                <motion.button key={tag.id} type="button" onClick={() => onToggleTag(tag)}
                                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-light border-transparent hover:border-gray-300 dark:hover:border-dark-border'}`}>
                                    {tag.name}
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                    {visibleCount < filteredTags.length && (
                        <button type="button" onClick={() => setVisibleCount(c => c + TAGS_PER_PAGE)} className="w-full text-center text-sm font-semibold text-primary py-2 flex items-center justify-center">
                            Vis flere <ChevronDown size={16} className="ml-1"/>
                        </button>
                    )}
                </div>
            </div>
             <div className="flex-shrink-0 mt-2 p-2 bg-gray-50 dark:bg-dark-surface-light rounded-lg">
                <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-2">Valgte: {selectedTags.length}{goal && ` / ${goal}`}</p>
                    {goal && <p className="text-xs font-bold text-primary">{Math.round(progress)}%</p>}
                </div>
                {goal && <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-1.5 mb-2"><motion.div className="bg-primary h-1.5 rounded-full" animate={{ width: `${progress}%` }} /></div>}
                <div className="h-12 overflow-y-auto flex flex-wrap gap-1">
                    <AnimatePresence>
                    {selectedTags.map(tag => (
                        <motion.div key={tag.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                            className="flex items-center bg-primary text-white px-2 py-1 rounded-full text-xs">
                            <span>{tag.name}</span>
                            <button type="button" onClick={() => onToggleTag(tag)} className="ml-1.5 text-white/70 hover:text-white"><X size={12}/></button>
                        </motion.div>
                    ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};


const CreateProfilePage: React.FC<CreateProfilePageProps> = ({ onProfileCreated }) => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [location, setLocation] = useState('');
    const [bio, setBio] = useState('');
    
    // Interests state
    const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
    const [allInterests, setAllInterests] = useState<Interest[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
    
    // Personality tags state
    const [personalityTagCategories, setPersonalityTagCategories] = useState<PersonalityTagCategory[]>([]);
    const [allPersonalityTags, setAllPersonalityTags] = useState<PersonalityTag[]>([]);
    const [selectedPersonalityTags, setSelectedPersonalityTags] = useState<PersonalityTag[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTagData = async () => {
            const { data: iCatData } = await supabase.from('interest_categories').select('*').order('name');
            const { data: iData } = await supabase.from('interests').select('*');
            if (iCatData) setInterestCategories(iCatData);
            if (iData) setAllInterests(iData);
            
            const { data: pCatData } = await supabase.from('personality_tag_categories').select('*').order('name');
            const { data: pData } = await supabase.from('personality_tags').select('*');
            if (pCatData) setPersonalityTagCategories(pCatData);
            if (pData) setAllPersonalityTags(pData);
        };
        fetchTagData();
    }, []);

    const handleInterestToggle = (interest: Interest) => {
        setSelectedInterests(prev => prev.some(i => i.id === interest.id) ? prev.filter(i => i.id !== interest.id) : [...prev, interest]);
    };
    
    const handlePersonalityTagToggle = (tag: PersonalityTag) => {
        setSelectedPersonalityTags(prev => prev.some(t => t.id === tag.id) ? prev.filter(t => t.id !== tag.id) : [...prev, tag]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError('Du skal være logget ind for at oprette en profil.');
            setLoading(false);
            navigate('/login');
            return;
        }

        const ageNumber = parseInt(age, 10);
        if (isNaN(ageNumber) || ageNumber <= 0) {
            setError('Indtast venligst en gyldig alder.');
            setLoading(false);
            return;
        }

        const { data: profileData, error: upsertError } = await supabase
            .from('users')
            .upsert({ auth_id: user.id, name, age: ageNumber, location, bio }, { onConflict: 'auth_id' })
            .select().single();

        if (upsertError || !profileData) {
            setError(upsertError?.message || 'Kunne ikke gemme profil.');
            setLoading(false);
            return;
        }

        // Save interests
        await supabase.from('user_interests').delete().eq('user_id', profileData.id);
        if (selectedInterests.length > 0) {
            const userInterestsData = selectedInterests.map(i => ({ user_id: profileData.id, interest_id: i.id }));
            await supabase.from('user_interests').insert(userInterestsData);
        }
        
        // Save personality tags
        await supabase.from('user_personality_tags').delete().eq('user_id', profileData.id);
        if (selectedPersonalityTags.length > 0) {
            const userTagsData = selectedPersonalityTags.map(t => ({ user_id: profileData.id, tag_id: t.id }));
            await supabase.from('user_personality_tags').insert(userTagsData);
        }
        
        onProfileCreated();
    };

    return (
        <div className="min-h-screen w-full bg-gray-50 dark:bg-dark-background p-4 md:p-8 flex items-center justify-center">
            <form className="w-full max-w-3xl space-y-8" onSubmit={handleSubmit}>
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-2">Fortæl os lidt om dig selv</h1>
                    <p className="text-text-secondary dark:text-dark-text-secondary">Disse oplysninger hjælper os med at finde de bedste matches til dig.</p>
                </div>
                {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
                
                {/* Basic Info Section */}
                <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-lg">
                    <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Grundlæggende oplysninger</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn</label>
                            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-md" required />
                        </div>
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Alder</label>
                            <input type="number" id="age" value={age} onChange={e => setAge(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-md" required />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Lokation</label>
                            <input type="text" id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="F.eks. Aalborg, Danmark" className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-md" required />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Kort bio</label>
                            <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Fortæl lidt om dine interesser..." className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-md" required />
                        </div>
                    </div>
                </div>

                {/* Interests Section */}
                <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-lg">
                     <TagSelector
                        title="Vælg dine interesser"
                        categories={interestCategories}
                        allTags={allInterests}
                        selectedTags={selectedInterests}
                        onToggleTag={tag => handleInterestToggle(tag as Interest)}
                        goal={INTEREST_GOAL}
                    />
                </div>

                {/* Personality Tags Section */}
                 <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-lg">
                    <TagSelector
                        title="Beskriv din personlighed"
                        categories={personalityTagCategories}
                        allTags={allPersonalityTags}
                        selectedTags={selectedPersonalityTags}
                        onToggleTag={tag => handlePersonalityTagToggle(tag as PersonalityTag)}
                    />
                </div>

                {/* Submit Button */}
                <div>
                    <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50 flex items-center justify-center">
                        {loading && <Loader2 className="animate-spin mr-2" />}
                        Fortsæt til Personlighedstest
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateProfilePage;
