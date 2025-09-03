
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { Interest } from '../types';
import { X, Plus, UploadCloud } from 'lucide-react';
import { uploadFile } from '../services/s3Service';

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
    const [images, setImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
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
            let { data: existingInterest } = await supabase.from('interests').select('id, name').eq('name', newInterestName).single();
            
            if (!existingInterest) {
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
    
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesToUpload = Array.from(e.target.files).slice(0, 6 - images.length);
            if (filesToUpload.length === 0) return;

            setIsUploading(true);
            setError(null);
            try {
                const uploadPromises = filesToUpload.map(file => uploadFile(file));
                const uploadedUrls = await Promise.all(uploadPromises);
                setImages(prev => [...prev, ...uploadedUrls]);
            } catch (error) {
                console.error("Error uploading files:", error);
                setError("Der skete en fejl under billed-upload.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const removeImage = (imageToRemove: string) => {
        setImages(images.filter(img => img !== imageToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        if (images.length === 0) {
            setError("Upload venligst mindst ét profilbillede.");
            setLoading(false);
            return;
        }

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
            .upsert({
                auth_id: user.id,
                name,
                age: ageNumber,
                location,
                bio,
                emojis: selectedEmojis,
                avatar_url: images[0],
            }, { onConflict: 'auth_id' })
            .select()
            .single();

        if (upsertError) {
            setError(upsertError.message);
            setLoading(false);
            return;
        }

        if (profileData) {
            await supabase.from('user_profile_images').delete().eq('user_id', profileData.id);
            const profileImagesData = images.map(url => ({ user_id: profileData.id, image_url: url }));
            const { error: imageInsertError } = await supabase.from('user_profile_images').insert(profileImagesData);
            if (imageInsertError) {
                setError(`Profil gemt, men billeder kunne ikke gemmes: ${imageInsertError.message}`);
            }

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
        
        onProfileCreated();
    };


    return (
        <div className="min-h-screen w-full bg-gray-50 dark:bg-dark-background p-4 md:p-8 flex items-center justify-center">
            <div className="w-full max-w-4xl bg-white dark:bg-dark-surface rounded-2xl shadow-xl p-6 md:p-10">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-2">Fortæl os lidt om dig selv</h1>
                    <p className="text-text-secondary dark:text-dark-text-secondary mb-8">
                        Disse oplysninger hjælper os med at finde de bedste matches til dig.
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm mb-4">{error}</p>}
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Profilbilleder (1-6 påkrævet)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {images.map((img, index) => (
                                        <div key={index} className="relative aspect-square">
                                            <img src={img} alt={`preview ${index}`} className="w-full h-full object-cover rounded-lg"/>
                                            <button type="button" onClick={() => removeImage(img)} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75"><X size={16}/></button>
                                        </div>
                                    ))}
                                    {images.length < 6 && (
                                        <div onClick={() => !isUploading && imageInputRef.current?.click()} className={`flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 dark:border-dark-border rounded-lg transition-colors ${isUploading ? 'cursor-wait bg-gray-100 dark:bg-dark-surface-light' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-surface-light'}`}>
                                            {isUploading ? (
                                                <>
                                                    <UploadCloud size={32} className="text-gray-400 mb-2 animate-pulse"/>
                                                    <p className="text-xs text-gray-500 text-center">Uploader...</p>
                                                </>
                                            ) : (
                                                <Plus size={32} className="text-gray-400"/>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file" ref={imageInputRef} onChange={handleImageUpload}
                                    multiple accept="image/*" className="hidden" disabled={isUploading}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn</label>
                                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                                </div>
                                <div>
                                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Alder</label>
                                    <input type="number" id="age" value={age} onChange={(e) => setAge(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Lokation</label>
                                <input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="F.eks. Aalborg, Danmark" required />
                            </div>
                            <div>
                                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Kort bio</label>
                                <textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Fortæl lidt om dine interesser..." required />
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Vælg {MAX_EMOJIS} emojis der beskriver dig</label>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {emojiOptions.map(e => (
                                        <button key={e} type="button" onClick={() => handleEmojiSelect(e)} 
                                        className={`text-2xl p-2 aspect-square rounded-lg flex items-center justify-center transition-transform duration-200 ${selectedEmojis.includes(e) ? 'bg-primary-light dark:bg-primary/20 scale-110' : 'bg-gray-100 dark:bg-dark-surface-light hover:bg-gray-200'}`}>
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Interesser</label>
                                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-2">Vælg fra forslag eller tilføj dine egne.</p>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {suggestedInterests.map(interest => (
                                        <button key={interest.id} type="button" onClick={() => handleInterestSelect(interest)}
                                            className="bg-gray-200 dark:bg-dark-surface-light text-gray-800 dark:text-dark-text-primary px-3 py-1 rounded-full text-sm hover:bg-gray-300 dark:hover:bg-dark-border">
                                            + {interest.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-dark-surface-light rounded-lg min-h-[6rem] mb-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {selectedInterests.map(interest => (
                                            <div key={interest.id} className="flex items-center bg-primary text-white px-3 py-1 rounded-full text-sm">
                                                <span>{interest.name}</span>
                                                <button type="button" onClick={() => removeInterest(interest)} className="ml-2 -mr-1 text-white hover:bg-primary-dark rounded-full p-0.5"><X size={14}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input type="text" value={interestInput} onChange={e => setInterestInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomInterest())}
                                        className="w-full px-3 py-2 bg-white dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="Tilføj dine egne interesser..." />
                                    <button type="button" onClick={handleAddCustomInterest} className="bg-primary text-white font-bold px-4 rounded-lg text-sm">Tilføj</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-6">
                        <button type="submit" disabled={loading}
                            className="w-full max-w-xs mx-auto block bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50">
                            {loading ? 'Gemmer...' : 'Fortsæt til Personlighedstest'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProfilePage;
