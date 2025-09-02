
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { Interest } from '../types';
import { X } from 'lucide-react';

const emojiOptions = ['😉', '🎮', '☕', '🌳', '🎲', '🍻', '📚', '🎨', '🏛️', '🗺️', '🍕', '🎵'];
const MAX_EMOJIS = 3;

interface CreateProfilePageProps {
  onProfileCreated: () => void;
}

const CreateProfilePage: React.FC<CreateProfilePageProps> = ({ onProfileCreated }) => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [location, setLocation] = useState('');
    const [bio, setBio] = useState('');
    const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
    const [suggestedInterests, setSuggestedInterests] = useState<Interest[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
    const [interestInput, setInterestInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInterests = async () => {
            const { data, error } = await supabase.from('interests').select('*').limit(10);
            if (error) console.error("Error fetching interests", error);
            else setSuggestedInterests(data || []);
        };
        fetchInterests();
    }, []);

    const handleEmojiSelect = (emoji: string) => {
        if (selectedEmojis.includes(emoji)) {
            setSelectedEmojis(prev => prev.filter(e => e !== emoji));
        } else if (selectedEmojis.length < MAX_EMOJIS) {
            setSelectedEmojis(prev => [...prev, emoji]);
        }
    };

    const handleInterestSelect = (interest: Interest) => {
        if (!selectedInterests.find(i => i.id === interest.id)) {
            setSelectedInterests(prev => [...prev, interest]);
        }
    };
    
    const handleAddCustomInterest = async () => {
        const newInterestName = interestInput.trim();
        if (newInterestName && !selectedInterests.find(i => i.name.toLowerCase() === newInterestName.toLowerCase())) {
            // Check if interest already exists in DB
            let { data: existingInterest } = await supabase.from('interests').select('id, name').eq('name', newInterestName).single();
            
            if (!existingInterest) {
                // If not, insert it
                const { data: newInterest, error } = await supabase.from('interests').insert({ name: newInterestName }).select().single();
                if (error) { console.error("Error creating interest:", error); return; }
                existingInterest = newInterest;
            }
            
            setSelectedInterests(prev => [...prev, existingInterest as Interest]);
            setInterestInput('');
        }
    };
    
    const removeInterest = (interestToRemove: Interest) => {
        setSelectedInterests(prev => prev.filter(i => i.id !== interestToRemove.id));
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

        // Use upsert to handle cases where a user might re-submit this form.
        const { data: profileData, error: upsertError } = await supabase
            .from('users')
            .upsert({
                auth_id: user.id,
                name,
                age: ageNumber,
                location,
                bio,
                emojis: selectedEmojis,
                avatar_url: `https://i.pravatar.cc/80?u=${user.id}`,
            }, { onConflict: 'auth_id' })
            .select()
            .single();

        if (upsertError) {
            setError(upsertError.message);
            setLoading(false);
            return;
        }

        if (profileData) {
             // First, clear existing interests for this user to avoid duplicates on re-submission
            await supabase.from('user_interests').delete().eq('user_id', profileData.id);
            
            if (selectedInterests.length > 0) {
                const userInterestsData = selectedInterests.map(interest => ({
                    user_id: profileData.id,
                    interest_id: interest.id,
                }));
                const { error: interestError } = await supabase.from('user_interests').insert(userInterestsData);
                if (interestError) {
                    setError(`Profile saved, but failed to save interests: ${interestError.message}`);
                    setLoading(false);
                    return;
                }
            }
        }
        
        // Success! Signal to App.tsx that the profile is updated.
        // App.tsx will re-fetch and handle the redirect to the personality test.
        onProfileCreated();
    };


    return (
        <div className="p-4 h-full flex flex-col bg-gray-50 dark:bg-dark-background">
            <div className="flex-shrink-0 text-center">
                <h1 className="text-xl font-bold text-primary">SoulMatch</h1>
            </div>
            <div className="flex-grow flex flex-col justify-center">
                <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-2">Fortæl os lidt om dig selv</h1>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6">
                    Disse oplysninger hjælper os med at finde de bedste matches til dig.
                </p>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn</label>
                            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                        </div>
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Alder</label>
                            <input type="number" id="age" value={age} onChange={(e) => setAge(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Lokation</label>
                        <input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="F.eks. Aalborg, Danmark" required />
                    </div>
                     <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Kort bio</label>
                        <textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Fortæl lidt om dine interesser..." required />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Vælg {MAX_EMOJIS} emojis der beskriver dig</label>
                        <div className="grid grid-cols-6 gap-2">
                            {emojiOptions.map(e => (
                                <button key={e} type="button" onClick={() => handleEmojiSelect(e)} 
                                className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${selectedEmojis.includes(e) ? 'bg-primary-light scale-110' : 'bg-gray-100 dark:bg-dark-surface hover:bg-gray-200'}`}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Interesser</label>
                         <div className="flex flex-wrap gap-2 mb-2">
                            {suggestedInterests.map(interest => (
                                <button key={interest.id} type="button" onClick={() => handleInterestSelect(interest)}
                                    className="bg-gray-200 dark:bg-dark-surface-light text-gray-800 dark:text-dark-text-primary px-3 py-1 rounded-full text-sm hover:bg-gray-300 dark:hover:bg-dark-border">
                                    + {interest.name}
                                </button>
                            ))}
                         </div>
                         <div className="flex flex-wrap items-center gap-2 mb-2 min-h-[2rem]">
                             {selectedInterests.map(interest => (
                                <div key={interest.id} className="flex items-center bg-primary text-white px-3 py-1 rounded-full text-sm">
                                    <span>{interest.name}</span>
                                    <button type="button" onClick={() => removeInterest(interest)} className="ml-2 -mr-1 text-white hover:bg-primary-dark rounded-full p-0.5"><X size={14}/></button>
                                </div>
                             ))}
                         </div>
                         <div className="flex gap-2">
                            <input type="text" value={interestInput} onChange={e => setInterestInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomInterest())}
                                className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Tilføj dine egne interesser..." />
                            <button type="button" onClick={handleAddCustomInterest} className="bg-primary text-white font-bold px-4 rounded-lg text-sm">Tilføj</button>
                         </div>
                    </div>

                    <div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50 mt-4">
                            {loading ? 'Gemmer...' : 'Fortsæt'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProfilePage;
