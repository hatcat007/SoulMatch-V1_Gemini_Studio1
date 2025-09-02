import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Settings, MessageCircle, Edit, Save, Plus, X } from 'lucide-react';
import NotificationIcon from '../components/NotificationIcon';
import { supabase } from '../services/supabase';
import type { User } from '../types';
import { uploadFile } from '../services/s3Service';

interface Trait {
  label: string;
  value: number; // 0 to 100
}

interface UserTrait {
    trait: string;
    value: number;
}

interface ProfileImage {
    id: number;
    image_url: string;
}

const TraitSlider: React.FC<{ trait: Trait; isEditing: boolean; onChange: (value: number) => void }> = ({ trait, isEditing, onChange }) => {
  const isBalanced = trait.value > 40 && trait.value < 60;
  return (
    <div className="mb-4">
        <div className="flex justify-between items-center mb-1 text-sm text-gray-600 dark:text-dark-text-secondary">
            <span>{trait.label}</span>
            {isEditing && <span>{trait.value}</span>}
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-surface-light rounded-full h-2 relative">
             <div className="bg-gray-300 dark:bg-dark-border h-2 absolute top-0 left-1/2 w-px"></div>
             <div
                className={`h-2 rounded-full ${isBalanced ? 'bg-yellow-400' : trait.value > 50 ? 'bg-red-400' : 'bg-blue-400'}`}
                style={{ width: `${Math.abs(trait.value - 50)}%`, left: `${Math.min(trait.value, 50)}%` }}
            ></div>
        </div>
        {isEditing && (
            <input 
                type="range" min="0" max="100" value={trait.value} 
                onChange={(e) => onChange(parseInt(e.target.value, 10))}
                className="w-full mt-2"
            />
        )}
        <div className="flex justify-between items-center mt-1 text-xs text-gray-500 dark:text-dark-text-secondary/80">
            <span>{trait.value > 50 ? '' : 'Indadvendt'}</span>
            <span>{trait.value < 50 ? '' : 'Udadvendt'}</span>
        </div>
    </div>
  )
};

const ProfilePage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [profileImages, setProfileImages] = useState<ProfileImage[]>([]);
    const [traits, setTraits] = useState<UserTrait[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formState, setFormState] = useState({ name: '', location: '', bio: '', personality_type: '' });
    const imageInputRef = useRef<HTMLInputElement>(null);

    const fetchProfile = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); return; }

        const { data: profileData } = await supabase.from('users').select('*').eq('auth_id', session.user.id).single();
        if (profileData) {
            setUser(profileData);
            setFormState({
                name: profileData.name || '',
                location: profileData.location || '',
                bio: profileData.bio || '',
                personality_type: profileData.personality_type || ''
            });

            const { data: imagesData } = await supabase.from('user_profile_images').select('*').eq('user_id', profileData.id);
            if (imagesData) setProfileImages(imagesData);

            const { data: traitsData } = await supabase.from('user_traits').select('*').eq('user_id', profileData.id);
            if (traitsData) setTraits(traitsData);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleTraitChange = (traitName: string, value: number) => {
        setTraits(prev => prev.map(t => t.trait === traitName ? { ...t, value } : t));
    };

    const handleSave = async () => {
        if (!user) return;
        setIsEditing(false);
        const { error: userError } = await supabase.from('users').update({
            name: formState.name,
            location: formState.location,
            bio: formState.bio,
            personality_type: formState.personality_type,
        }).eq('id', user.id);
        if (userError) console.error('Error updating user:', userError);

        const { error: traitsError } = await supabase.from('user_traits').upsert(
            traits.map(t => ({ user_id: user.id, trait: t.trait, value: t.value })),
            { onConflict: 'user_id,trait' }
        );
        if (traitsError) console.error('Error updating traits:', traitsError);

        await fetchProfile(); // Re-fetch to show saved data
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && user) {
            const file = e.target.files[0];
            try {
                const imageUrl = await uploadFile(file);
                const { error } = await supabase.from('user_profile_images').insert({
                    user_id: user.id,
                    image_url: imageUrl,
                });
                if (error) throw error;
                await fetchProfile();
            } catch (error) {
                console.error("Error uploading image:", error);
            }
        }
    };
    
    const handleImageDelete = async (imageId: number) => {
        const { error } = await supabase.from('user_profile_images').delete().eq('id', imageId);
        if (error) console.error("Error deleting image:", error);
        else setProfileImages(prev => prev.filter(img => img.id !== imageId));
    };

    if (loading) return <div className="p-4 text-center">Loading profile...</div>;
    if (!user) return <div className="p-4 text-center">Could not load profile.</div>;

    const displayTraits: Trait[] = [
        { label: 'Abstrakt opfattelse', value: traits.find(t=>t.trait === 'Abstrakt opfattelse')?.value || 50 },
        { label: 'Emotionel tænkning', value: traits.find(t=>t.trait === 'Emotionel tænkning')?.value || 50 },
        { label: 'Rationel tænkning', value: traits.find(t=>t.trait === 'Rationel tænkning')?.value || 50 },
        { label: 'Konkret opfattelse', value: traits.find(t=>t.trait === 'Konkret opfattelse')?.value || 50 },
    ];

  return (
    <div className="bg-gray-50 dark:bg-dark-background min-h-full">
      <div className="p-4 md:p-6 lg:max-w-6xl lg:mx-auto">
        <div className="flex justify-between items-center mb-4">
            <div className="w-10"></div> {/* Spacer */}
            <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
            <div className="flex items-center space-x-1">
                 <NotificationIcon />
                <button className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
                    <MessageCircle size={24}/>
                </button>
                <Link to="/settings" className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
                    <Settings size={24}/>
                </Link>
            </div>
        </div>
        
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-1 flex flex-col items-center text-center">
                <img 
                    src={user.avatar_url || 'https://i.pravatar.cc/120?u=placeholder'}
                    alt={user.name} 
                    className="w-28 h-28 rounded-full border-4 border-white dark:border-dark-surface shadow-lg mb-3 object-cover"
                />
                {isEditing ? (
                    <input type="text" name="name" value={formState.name} onChange={handleInputChange} className="text-2xl font-bold text-center bg-gray-100 dark:bg-dark-surface-light rounded-md p-1"/>
                ) : (
                    <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{user.name} 🛡️</h1>
                )}
                {isEditing ? (
                    <input type="text" name="location" value={formState.location} onChange={handleInputChange} className="text-center bg-gray-100 dark:bg-dark-surface-light rounded-md p-1 mt-1"/>
                ) : (
                    <p className="text-text-secondary dark:text-dark-text-secondary">{user.location}</p>
                )}
                {isEditing ? (
                    <textarea name="bio" value={formState.bio} onChange={handleInputChange} rows={4} className="mt-2 max-w-xs w-full text-text-secondary dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-surface-light rounded-md p-1" />
                ) : (
                    <p className="mt-2 max-w-xs text-text-secondary dark:text-dark-text-secondary">
                        {user.bio}
                    </p>
                )}

                 <div className="flex justify-center space-x-4 my-6">
                    <div className="w-16 h-16 rounded-full bg-yellow-200 dark:bg-yellow-500/30 flex items-center justify-center text-3xl">😉</div>
                    <div className="w-16 h-16 rounded-full bg-red-200 dark:bg-red-500/30 flex items-center justify-center text-3xl">🎮</div>
                    <div className="w-16 h-16 rounded-full bg-blue-200 dark:bg-blue-500/30 flex items-center justify-center text-3xl">☕</div>
                </div>
                 <button onClick={isEditing ? handleSave : () => setIsEditing(true)} className="flex items-center justify-center w-full max-w-xs bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg">
                    {isEditing ? <><Save size={20} className="mr-2"/> Gem Profil</> : <><Edit size={20} className="mr-2"/> Rediger Profil</>}
                 </button>
            </div>

            <div className="lg:col-span-2 mt-8 lg:mt-0">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-3">Billeder som beskriver mig</h2>
                    <div className="grid grid-cols-3 gap-2">
                        {profileImages.map(img => (
                            <div key={img.id} className="relative aspect-square">
                                <img src={img.image_url} alt="profile" className="rounded-lg aspect-square object-cover"/>
                                {isEditing && <button onClick={() => handleImageDelete(img.id)} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75"><X size={16}/></button>}
                            </div>
                        ))}
                        {isEditing && profileImages.length < 3 && (
                            <button onClick={() => imageInputRef.current?.click()} className="flex items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                                <Plus size={32} className="text-gray-400"/>
                            </button>
                        )}
                        <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-3">Personlighed</h2>
                    {isEditing ? (
                        <input type="text" name="personality_type" value={formState.personality_type} onChange={handleInputChange} placeholder="f.eks. INFJ" className="text-xl font-bold bg-gray-100 dark:bg-dark-surface-light rounded-md p-1 mb-4"/>
                    ) : (
                        <p className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">{user.personality_type}</p>
                    )}
                    {displayTraits.map(trait => (
                        <TraitSlider 
                            key={trait.label} 
                            trait={trait} 
                            isEditing={isEditing} 
                            onChange={(value) => handleTraitChange(trait.label, value)}
                        />
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
