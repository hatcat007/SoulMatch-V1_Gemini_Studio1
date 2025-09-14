

import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Interest, InterestCategory, PersonalityTag, PersonalityTagCategory } from '../types';
import { Loader2, Heart, BrainCircuit, User as UserIcon, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TagSelector from '../components/TagSelector';
import AnimatedAvatarGraphic from '../components/AnimatedAvatarGraphic';
import { useAuth } from '../contexts/AuthContext';

interface CreateProfilePageProps {
  onProfileCreated: () => void;
}

const INTEREST_GOAL = 35;
const TAG_GOAL = 15;

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
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ name: '', age: '', location: '', bio: '' });
    
    const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
    const [allInterests, setAllInterests] = useState<Interest[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);

    const [personalityTagCategories, setPersonalityTagCategories] = useState<PersonalityTagCategory[]>([]);
    const [allPersonalityTags, setAllPersonalityTags] = useState<PersonalityTag[]>([]);
    const [selectedPersonalityTags, setSelectedPersonalityTags] = useState<PersonalityTag[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const { data: iCatData } = await supabase.from('interest_categories').select('*').order('name');
            const { data: iData } = await supabase.from('interests').select('*');
            setInterestCategories(iCatData || []);
            setAllInterests(iData || []);
            
            const { data: pCatData } = await supabase.from('personality_tag_categories').select('*').order('name');
            const { data: pData } = await supabase.from('personality_tags').select('*');
            setPersonalityTagCategories(pCatData || []);
            setAllPersonalityTags(pData || []);
        };
        fetchData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleNext = () => {
        setError(null);
        if (step === 1) {
            if (!formData.name.trim() || !formData.age.trim() || !formData.location.trim() || !formData.bio.trim()) {
                setError("Udfyld venligst alle felter.");
                return;
            }
             if (isNaN(parseInt(formData.age, 10)) || parseInt(formData.age, 10) < 16) {
                setError("Du skal være mindst 16 år gammel.");
                return;
            }
        }
        if (step === 2 && selectedInterests.length < INTEREST_GOAL) {
            setError(`Vælg venligst mindst ${INTEREST_GOAL} interesser for det bedste match.`);
            return;
        }
        if (step === 3 && selectedPersonalityTags.length < TAG_GOAL) {
             setError(`Vælg venligst mindst ${TAG_GOAL} personlighedstags.`);
             return;
        }

        if (step < 3) setStep(step + 1);
        else handleSubmit();
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        if (!user) { setError("Bruger ikke fundet. Prøv venligst at logge ind igen."); return; }
        setLoading(true);
        setError(null);
        
        // Update user profile
        const { error: profileError } = await supabase
            .from('users')
            .update({
                name: formData.name,
                age: parseInt(formData.age, 10),
                location: formData.location,
                bio: formData.bio,
            })
            .eq('auth_id', user.auth_id);

        if (profileError) { setError(profileError.message); setLoading(false); return; }
        
        // Sync interests
        await supabase.from('user_interests').delete().eq('user_id', user.id);
        if (selectedInterests.length > 0) {
            await supabase.from('user_interests').insert(selectedInterests.map(i => ({ user_id: user.id, interest_id: i.id })));
        }
        
        // Sync personality tags
        await supabase.from('user_personality_tags').delete().eq('user_id', user.id);
        if (selectedPersonalityTags.length > 0) {
            await supabase.from('user_personality_tags').insert(selectedPersonalityTags.map(t => ({ user_id: user.id, tag_id: t.id })));
        }

        setLoading(false);
        onProfileCreated();
    };
    
    const StepContent: React.FC<{ step: number }> = ({ step }) => {
        const stepDetails = [
            { icon: UserIcon, title: "Fortæl os om dig selv", description: "Dette hjælper os med at finde de bedste matches til dig." },
            { icon: Heart, title: "Hvad er dine interesser?", description: `Vælg mindst ${INTEREST_GOAL} for det mest præcise match.` },
            { icon: BrainCircuit, title: "Hvordan beskriver du din personlighed?", description: `Vælg mindst ${TAG_GOAL} tags, der passer bedst på dig.` }
        ];

        const currentStep = stepDetails[step - 1];

        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="flex items-center text-left mb-6">
                    <div className="bg-primary-light dark:bg-primary/20 text-primary p-3 rounded-full mr-4">
                        <currentStep.icon size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{currentStep.title}</h2>
                        <p className="text-text-secondary dark:text-dark-text-secondary">{currentStep.description}</p>
                    </div>
                </div>
                {step === 1 && (
                    <div className="space-y-4">
                        <input name="name" placeholder="Fulde Navn" value={formData.name} onChange={handleInputChange} className="input-style" />
                        <input name="age" type="number" placeholder="Alder" value={formData.age} onChange={handleInputChange} className="input-style" />
                        <input name="location" placeholder="By" value={formData.location} onChange={handleInputChange} className="input-style" />
                        <textarea name="bio" placeholder="Skriv en kort bio om dig selv..." rows={4} value={formData.bio} onChange={handleInputChange} className="input-style w-full"></textarea>
                    </div>
                )}
                {step === 2 && (
                    <TagSelector 
                        title=""
                        categories={interestCategories}
                        allTags={allInterests}
                        selectedTags={selectedInterests}
                        onToggleTag={(tag) => setSelectedInterests(prev => prev.some(i => i.id === tag.id) ? prev.filter(i => i.id !== tag.id) : [...prev, tag as Interest])}
                        goal={INTEREST_GOAL}
                    />
                )}
                {step === 3 && (
                    <TagSelector
                        title=""
                        categories={personalityTagCategories}
                        allTags={allPersonalityTags}
                        selectedTags={selectedPersonalityTags}
                        onToggleTag={(tag) => setSelectedPersonalityTags(prev => prev.some(t => t.id === tag.id) ? prev.filter(t => t.id !== tag.id) : [...prev, tag as PersonalityTag])}
                        goal={TAG_GOAL}
                    />
                )}
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-gray-50 dark:bg-dark-background">
             {/* Left decorative panel */}
            <div className="hidden lg:flex flex-col items-center justify-center bg-primary-light dark:bg-dark-surface p-12 text-center">
                <h1 className="text-4xl font-bold text-primary mb-8">SoulMatch</h1>
                <div className="transform scale-110">
                    <AnimatedAvatarGraphic />
                </div>
                <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-12">Velkommen til!</h2>
                <p className="text-text-secondary dark:text-dark-text-secondary text-lg mt-4 max-w-sm">
                    Lad os oprette din profil, så du kan begynde at finde nye venner og oplevelser.
                </p>
            </div>
            
            {/* Right form panel */}
            <div className="flex flex-col justify-center items-center p-6 sm:p-8">
                 <div className="w-full max-w-lg">
                    <ProgressBar step={step} totalSteps={3} />
                    <AnimatePresence mode="wait">
                        <StepContent key={step} step={step} />
                    </AnimatePresence>
                    
                    {error && <p className="text-red-500 text-center text-sm mt-4">{error}</p>}
                    
                    <div className="mt-8 flex gap-4">
                        {step > 1 && (
                            <button onClick={handleBack} className="flex items-center justify-center bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-full transition hover:bg-gray-300">
                                <ArrowLeft size={18} className="mr-2"/> Tilbage
                            </button>
                        )}
                        <button onClick={handleNext} disabled={loading} className="flex-1 bg-primary text-white font-bold py-3 px-6 rounded-full text-lg transition hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center">
                            {loading && <Loader2 className="animate-spin mr-2"/>}
                            {step < 3 ? 'Fortsæt' : loading ? 'Gemmer...' : 'Færdiggør Profil'}
                        </button>
                    </div>
                 </div>
            </div>
             <style>{`.input-style { display: block; width: 100%; padding: 0.75rem 1rem; color: #212529; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.5rem; } .dark .input-style { background-color: #2a3343; border-color: #3c465b; color: #e2e8f0; }`}</style>
        </div>
    );
};

export default CreateProfilePage;
