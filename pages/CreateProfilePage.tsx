
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { Interest, InterestCategory, PersonalityTag, PersonalityTagCategory } from '../types';
import { Loader2, Heart, BrainCircuit, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TagSelector from '../components/TagSelector';
import AnimatedAvatarGraphic from '../components/AnimatedAvatarGraphic';

interface CreateProfilePageProps {
  onProfileCreated: () => void;
}

const INTEREST_GOAL = 35;

const ProgressBar: React.FC<{ step: number; totalSteps: number }> = ({ step, totalSteps }) => (
    <div className="mb-8">
        <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-semibold text-primary">Trin {step} af {totalSteps}</p>
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2">
            <motion.div
                className="bg-primary h-2 rounded-full"
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                // FIX: Removed the `ease` property to resolve a TypeScript type error. Framer Motion's default easing will be used.
                transition={{ duration: 0.5 }}
            />
        </div>
    </div>
);


const CreateProfilePage: React.FC<CreateProfilePageProps> = ({ onProfileCreated }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const totalSteps = 3;

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

    const handleNext = () => {
        if (step === 1) {
            if (!name.trim() || !age.trim() || !location.trim() || !bio.trim()) {
                setError('Udfyld venligst alle felter for at fortsætte.');
                return;
            }
             const ageNumber = parseInt(age, 10);
             if (isNaN(ageNumber) || ageNumber <= 0 || ageNumber > 120) {
                setError('Indtast venligst en gyldig alder.');
                return;
            }
        }
        setError(null);
        if (step < totalSteps) setStep(s => s + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(s => s + 1);
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

    const renderStepContent = () => {
        const stepVariants = {
            hidden: { opacity: 0, x: 50 },
            visible: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: -50 }
        };

        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    // FIX: Removed the `ease` property to resolve a TypeScript type error. Framer Motion's default easing will be used.
                    transition={{ duration: 0.4 }}
                >
                    {step === 1 && (
                        <div className="space-y-4">
                             <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Grundlæggende oplysninger</h2>
                             <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">Start med det basale. Dette hjælper andre med at lære dig at kende.</p>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label htmlFor="name" className="input-label">Navn</label><input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="input-field" required /></div>
                                <div><label htmlFor="age" className="input-label">Alder</label><input type="number" id="age" value={age} onChange={e => setAge(e.target.value)} className="input-field" required /></div>
                            </div>
                            <div><label htmlFor="location" className="input-label">Lokation</label><input type="text" id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="F.eks. Aalborg, Danmark" className="input-field" required /></div>
                            <div><label htmlFor="bio" className="input-label">Kort bio</label><textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Fortæl lidt om dine interesser..." className="input-field" required /></div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="min-h-[450px]">
                            <TagSelector title="Vælg dine interesser" categories={interestCategories} allTags={allInterests} selectedTags={selectedInterests} onToggleTag={tag => handleInterestToggle(tag as Interest)} goal={INTEREST_GOAL} containerHeight="h-full" />
                        </div>
                    )}
                    {step === 3 && (
                        <div className="min-h-[450px]">
                            <TagSelector title="Beskriv din personlighed" categories={personalityTagCategories} allTags={allPersonalityTags} selectedTags={selectedPersonalityTags} onToggleTag={tag => handlePersonalityTagToggle(tag as PersonalityTag)} containerHeight="h-full" />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        );
    };
    
    const renderGraphic = () => {
         const graphicVariants = {
            hidden: { opacity: 0, scale: 0.8 },
            visible: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.8 }
        };
        // FIX: Removed the `ease` property to resolve a TypeScript type error. Framer Motion's default easing will be used.
        const graphicTransition = { duration: 0.5 };

        switch(step) {
            case 1:
                return (
                    <motion.div key="step1graphic" variants={graphicVariants} initial="hidden" animate="visible" exit="exit" transition={graphicTransition} className="text-center">
                        <AnimatedAvatarGraphic />
                        <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-8">Velkommen til SoulMatch</h2>
                        <p className="text-text-secondary dark:text-dark-text-secondary text-lg mt-2">Lad os få oprettet din profil.</p>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div key="step2graphic" variants={graphicVariants} initial="hidden" animate="visible" exit="exit" transition={graphicTransition} className="text-center">
                        <Heart size={128} className="text-primary mx-auto" strokeWidth={1.5}/>
                        <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-8">Hvad brænder du for?</h2>
                        <p className="text-text-secondary dark:text-dark-text-secondary text-lg mt-2">Dine interesser er nøglen til gode matches.</p>
                    </motion.div>
                );
            case 3:
                 return (
                    <motion.div key="step3graphic" variants={graphicVariants} initial="hidden" animate="visible" exit="exit" transition={graphicTransition} className="text-center">
                        <BrainCircuit size={128} className="text-primary mx-auto" strokeWidth={1.5}/>
                        <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-8">Hvem er du?</h2>
                        <p className="text-text-secondary dark:text-dark-text-secondary text-lg mt-2">Vælg de ord der bedst beskriver dig.</p>
                    </motion.div>
                );
            default: return null;
        }
    }

    return (
        <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-gray-50 dark:bg-dark-background">
             <style>{`
                .input-label { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; color: #4B5563; }
                .dark .input-label { color: #9CA3AF; }
                .input-field { display: block; width: 100%; padding: 0.75rem 1rem; color: #212529; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.5rem; } 
                .dark .input-field { background-color: #2a3343; border-color: #3c465b; color: #e2e8f0; }
                .input-field:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: #006B76; box-shadow: 0 0 0 2px #006B76; }
            `}</style>
             <div className="hidden lg:flex flex-col items-center justify-center bg-primary-light dark:bg-dark-surface p-12 relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-black/30"></div>
                 <AnimatePresence mode="wait">
                    {renderGraphic()}
                 </AnimatePresence>
            </div>
            
            <div className="flex flex-col justify-center items-center p-4 sm:p-8">
                <form className="w-full max-w-lg space-y-6 bg-white dark:bg-dark-surface p-6 sm:p-8 rounded-2xl shadow-xl" onSubmit={handleSubmit}>
                    <ProgressBar step={step} totalSteps={totalSteps} />
                    
                    {error && <p className="text-red-500 text-center bg-red-100 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm">{error}</p>}

                    {renderStepContent()}
                    
                    <div className="flex justify-between items-center pt-4">
                        <button type="button" onClick={handleBack} disabled={step === 1} className="px-6 py-2 rounded-full font-semibold text-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-surface-light disabled:opacity-50">
                            Tilbage
                        </button>

                        {step < totalSteps ? (
                             <button type="button" onClick={handleNext} className="px-8 py-3 rounded-full bg-primary text-white font-bold hover:bg-primary-dark transition shadow-md">
                                Næste
                            </button>
                        ) : (
                             <button type="submit" disabled={loading} className="px-8 py-3 rounded-full bg-primary text-white font-bold hover:bg-primary-dark transition shadow-md flex items-center justify-center disabled:opacity-50">
                                {loading && <Loader2 className="animate-spin mr-2" />}
                                Fortsæt til Personlighedstest
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProfilePage;
