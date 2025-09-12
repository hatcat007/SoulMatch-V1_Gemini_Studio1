
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { User, Interest, InterestCategory, PersonalityTag, PersonalityTagCategory } from '../types';
import { Loader2, ArrowLeft, Camera, Save } from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';
import TagSelector from '../components/TagSelector';
import { uploadFile, fetchPrivateFile } from '../services/s3Service';

const SmartImage: React.FC<{ src: string; alt: string; className: string; }> = ({ src, alt, className }) => {
    const [displayUrl, setDisplayUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let objectUrlToRevoke: string | null = null;
        let isMounted = true;
        
        const processUrl = async () => {
            if (!src) { if(isMounted) setIsLoading(false); return; }
            setIsLoading(true);

            if (src.startsWith('blob:') || src.startsWith('data:')) {
                setDisplayUrl(src);
                setIsLoading(false);
            } else {
                try {
                    const fetchedBlobUrl = await fetchPrivateFile(src);
                    if (isMounted) { objectUrlToRevoke = fetchedBlobUrl; setDisplayUrl(fetchedBlobUrl); }
                } catch(e) { console.error("Failed to fetch private image", e); if (isMounted) setDisplayUrl(''); }
                finally { if (isMounted) setIsLoading(false); }
            }
        };

        processUrl();

        return () => {
            isMounted = false;
            if (objectUrlToRevoke) { URL.revokeObjectURL(objectUrlToRevoke); }
        };
    }, [src]);

    if (isLoading) return <div className={`${className} bg-gray-200 animate-pulse`} />;
    return <img src={displayUrl} alt={alt} className={className} />;
};


const EditProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { user, refetchUserProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({ name: '', age: '', location: '', bio: '', avatar_url: '' });
    const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
    const [selectedPersonalityTags, setSelectedPersonalityTags] = useState<PersonalityTag[]>([]);
    
    const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
    const [allInterests, setAllInterests] = useState<Interest[]>([]);
    const [personalityTagCategories, setPersonalityTagCategories] = useState<PersonalityTagCategory[]>([]);
    const [allPersonalityTags, setAllPersonalityTags] = useState<PersonalityTag[]>([]);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        const fetchData = async () => {
            if (!user) { navigate('/login'); return; }

            const { data, error: profileError } = await supabase
                .from('users')
                .select('*, interests:user_interests(interest:interests(*)), personality_tags:user_personality_tags(tag:personality_tags(*))')
                .eq('id', user.id)
                .single();

            if (profileError) { setError("Kunne ikke hente profil."); setLoading(false); return; }

            setFormData({
                name: data.name || '',
                age: data.age?.toString() || '',
                location: data.location || '',
                bio: data.bio || '',
                avatar_url: data.avatar_url || '',
            });

            setSelectedInterests(data.interests.map((i: any) => i.interest).filter(Boolean));
            setSelectedPersonalityTags(data.personality_tags.map((t: any) => t.tag).filter(Boolean));

            const { data: iCatData } = await supabase.from('interest_categories').select('*').order('name');
            const { data: iData } = await supabase.from('interests').select('*');
            setInterestCategories(iCatData || []);
            setAllInterests(iData || []);
            
            const { data: pCatData } = await supabase.from('personality_tag_categories').select('*').order('name');
            const { data: pData } = await supabase.from('personality_tags').select('*');
            setPersonalityTagCategories(pCatData || []);
            setAllPersonalityTags(pData || []);

            setLoading(false);
        };
        fetchData();
    }, [user, navigate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const previewUrl = URL.createObjectURL(file);
        setFormData(p => ({ ...p, avatar_url: previewUrl }));

        try {
            const finalUrl = await uploadFile(file);
            setFormData(p => ({ ...p, avatar_url: finalUrl }));
        } catch (err) {
            setError("Avatar upload fejlede.");
            // Revert to original on error
            setFormData(p => ({...p, avatar_url: user?.avatar_url || ''}));
        } finally {
            if (previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true); setError(null);

        const ageNumber = parseInt(formData.age, 10);
        if (isNaN(ageNumber) || ageNumber <= 0) {
            setError("Indtast venligst en gyldig alder.");
            setSaving(false);
            return;
        }

        const { error: upsertError } = await supabase
            .from('users')
            .update({
                name: formData.name,
                age: ageNumber,
                location: formData.location,
                bio: formData.bio,
                avatar_url: formData.avatar_url,
            })
            .eq('id', user.id);
            
        if (upsertError) { setError(upsertError.message); setSaving(false); return; }

        await supabase.from('user_interests').delete().eq('user_id', user.id);
        if (selectedInterests.length > 0) {
            await supabase.from('user_interests').insert(selectedInterests.map(i => ({ user_id: user.id, interest_id: i.id })));
        }
        
        await supabase.from('user_personality_tags').delete().eq('user_id', user.id);
        if (selectedPersonalityTags.length > 0) {
            await supabase.from('user_personality_tags').insert(selectedPersonalityTags.map(t => ({ user_id: user.id, tag_id: t.id })));
        }
        
        await refetchUserProfile();
        setSaving(false);
        navigate('/profile');
    };

    if (loading) return <LoadingScreen message="Indlæser din profil..." />;
    
    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
            <header className="flex-shrink-0 flex items-center p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft /></button>
                <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mx-auto">Rediger Profil</h1>
                <div className="w-8"></div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                 {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
                
                <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm text-center">
                    <div 
                        className="relative w-32 h-32 rounded-full mx-auto group cursor-pointer"
                        onClick={() => avatarInputRef.current?.click()}
                    >
                       <SmartImage src={formData.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                       <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera size={32} />
                            <span className="text-xs font-semibold mt-1">Skift billede</span>
                        </div>
                    </div>
                    <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*"/>
                </div>

                <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label>Navn</label><input name="name" value={formData.name} onChange={handleInputChange} className="input-style" /></div>
                        <div><label>Alder</label><input name="age" type="number" value={formData.age} onChange={handleInputChange} className="input-style" /></div>
                    </div>
                    <div><label>Lokation</label><input name="location" value={formData.location} onChange={handleInputChange} className="input-style" /></div>
                    <div><label>Bio</label><textarea name="bio" rows={4} value={formData.bio} onChange={handleInputChange} className="input-style"></textarea></div>
                </div>

                <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                     <TagSelector
                        title="Dine interesser"
                        categories={interestCategories}
                        allTags={allInterests}
                        selectedTags={selectedInterests}
                        onToggleTag={tag => setSelectedInterests(prev => prev.some(i => i.id === tag.id) ? prev.filter(i => i.id !== tag.id) : [...prev, tag as Interest])}
                        containerHeight="h-auto"
                    />
                </div>
                 <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                     <TagSelector
                        title="Din personlighed"
                        categories={personalityTagCategories}
                        allTags={allPersonalityTags}
                        selectedTags={selectedPersonalityTags}
                        onToggleTag={tag => setSelectedPersonalityTags(prev => prev.some(t => t.id === tag.id) ? prev.filter(t => t.id !== tag.id) : [...prev, tag as PersonalityTag])}
                        containerHeight="h-auto"
                    />
                </div>
            </main>

            <footer className="sticky bottom-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border p-4 z-10">
                <div className="max-w-2xl mx-auto">
                    <button onClick={handleSave} disabled={saving} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg flex items-center justify-center disabled:opacity-50">
                        {saving ? <Loader2 className="animate-spin mr-2"/> : <Save size={20} className="mr-2"/>}
                        {saving ? 'Gemmer...' : 'Gem Ændringer'}
                    </button>
                </div>
            </footer>
             <style>{`
                label { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; color: #4B5563; }
                .dark label { color: #9CA3AF; }
                .input-style { display: block; width: 100%; padding: 0.75rem 1rem; color: #212529; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.5rem; } 
                .dark .input-style { background-color: #2a3343; border-color: #3c465b; color: #e2e8f0; }
            `}</style>
        </div>
    );
};

export default EditProfilePage;
