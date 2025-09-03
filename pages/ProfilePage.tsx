import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, MessageCircle, Edit, Save, Plus, X, Users, BrainCircuit, ShieldCheck, ChevronLeft, ChevronRight, Image as ImageIcon, Loader2 } from 'lucide-react';
import NotificationIcon from '../components/NotificationIcon';
import { supabase } from '../services/supabase';
import type { User, Interest } from '../types';
import { uploadFile, fetchPrivateFile } from '../services/s3Service';
import { motion, AnimatePresence } from 'framer-motion';

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
    user_id: number;
}

const emojiOptions = ['😉', '🎮', '☕', '🌳', '🎲', '🍻', '📚', '🎨', '🏛️', '🗺️', '🍕', '🎵'];
const MAX_EMOJIS = 3;
const MAX_IMAGES = 6;

const traitLabels: Record<string, { low: string; high: string }> = {
    'Abstrakt opfattelse': { low: 'Observant', high: 'Abstrakt' },
    'Emotionel tænkning': { low: 'Logik-baseret', high: 'Følelses-baseret' },
    'Rationel tænkning': { low: 'Følelses-baseret', high: 'Logik-baseret' },
    'Konkret opfattelse': { low: 'Abstrakt', high: 'Praktisk' }
};

const TraitSlider: React.FC<{ trait: Trait }> = ({ trait }) => {
  const isBalanced = trait.value > 40 && trait.value < 60;
  const labels = traitLabels[trait.label] || { low: '', high: '' };
  
  return (
    <div className="mb-4">
        <div className="flex justify-between items-center mb-1 text-sm text-gray-600 dark:text-dark-text-secondary">
            <span>{trait.label}</span>
            <span>{trait.value}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-surface-light rounded-full h-2 relative">
             <div className="bg-gray-300 dark:bg-dark-border h-2 absolute top-0 left-1/2 w-px"></div>
             <div
                className={`h-2 rounded-full ${isBalanced ? 'bg-yellow-400' : trait.value > 50 ? 'bg-red-400' : 'bg-blue-400'}`}
                style={{ width: `${Math.abs(trait.value - 50)}%`, left: `${Math.min(trait.value, 50)}%` }}
            ></div>
        </div>
        <div className="flex justify-between items-center mt-1 text-xs text-gray-500 dark:text-dark-text-secondary/80">
            <span>{labels.low}</span>
            <span>{labels.high}</span>
        </div>
    </div>
  );
};

const ProfileImageSlider: React.FC<{
    images: ProfileImage[];
    isEditing: boolean;
    onDelete: (id: number) => void;
    onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ images, isEditing, onDelete, onAdd }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentImageUrl, setCurrentImageUrl] = useState('');
    const [isLoadingImage, setIsLoadingImage] = useState(true);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
        let isMounted = true;

        const fetchUrl = async () => {
            if (images.length > 0 && images[currentIndex]?.image_url) {
                setIsLoadingImage(true);
                const blobUrl = await fetchPrivateFile(images[currentIndex].image_url);
                if (isMounted) {
                    objectUrl = blobUrl;
                    setCurrentImageUrl(blobUrl);
                    setIsLoadingImage(false);
                }
            } else {
                 if (isMounted) setIsLoadingImage(false);
            }
        };
        fetchUrl();

        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [images, currentIndex]);

    const prevSlide = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const nextSlide = () => {
        const isLastSlide = currentIndex === images.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };
    
    const goToSlide = (slideIndex: number) => {
        setCurrentIndex(slideIndex);
    }
    
    useEffect(() => {
        if(currentIndex >= images.length && images.length > 0) {
            setCurrentIndex(images.length -1);
        }
    }, [images, currentIndex])

    if (images.length === 0 && !isEditing) {
        return (
            <div className="w-full aspect-square relative group bg-gray-100 dark:bg-dark-surface-light rounded-2xl flex items-center justify-center">
                <div className="text-center text-gray-400 dark:text-dark-text-secondary">
                    <ImageIcon size={48} className="mx-auto mb-2"/>
                    <p>Ingen billeder</p>
                </div>
            </div>
        );
    }
    
    if (images.length === 0 && isEditing) {
        return (
             <div className="w-full aspect-square relative group bg-gray-100 dark:bg-dark-surface-light rounded-2xl flex items-center justify-center">
                 <input type="file" ref={imageInputRef} onChange={onAdd} accept="image/*" className="hidden" />
                 <button onClick={() => imageInputRef.current?.click()} className="bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary-dark transition flex items-center">
                     <Plus size={24} className="mr-2"/> Tilføj billede
                 </button>
            </div>
        );
    }


    return (
        <div className="w-full aspect-square relative group bg-gray-100 dark:bg-dark-surface-light rounded-2xl">
             <AnimatePresence>
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full rounded-2xl bg-cover bg-center"
                    style={{ backgroundImage: `url(${currentImageUrl})` }}
                >
                     {isLoadingImage && (
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="animate-spin text-gray-500" size={32}/>
                        </div>
                    )}
                     {isEditing && !isLoadingImage && (
                        <button
                            onClick={() => onDelete(images[currentIndex].id)}
                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 z-10 hover:bg-red-700 transition"
                            aria-label="Delete image"
                        >
                            <X size={18} />
                        </button>
                    )}
                </motion.div>
            </AnimatePresence>
            
            {images.length > 1 && (
                 <>
                    <button onClick={prevSlide} className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/30 text-white p-2 rounded-full group-hover:opacity-100 opacity-0 transition-opacity z-10"><ChevronLeft size={24}/></button>
                    <button onClick={nextSlide} className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/30 text-white p-2 rounded-full group-hover:opacity-100 opacity-0 transition-opacity z-10"><ChevronRight size={24}/></button>
                </>
            )}

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
                {images.map((_, slideIndex) => (
                    <button key={slideIndex} onClick={() => goToSlide(slideIndex)} className={`w-2 h-2 rounded-full transition-colors ${currentIndex === slideIndex ? 'bg-white' : 'bg-white/50'}`}></button>
                ))}
            </div>

            {isEditing && images.length < MAX_IMAGES && (
                <div className="absolute bottom-0 right-0 m-2 z-10">
                     <input type="file" ref={imageInputRef} onChange={onAdd} accept="image/*" className="hidden" />
                     <button onClick={() => imageInputRef.current?.click()} className="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary-dark transition">
                         <Plus size={24}/>
                     </button>
                </div>
            )}
        </div>
    );
};

const ProfilePage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [profileImages, setProfileImages] = useState<ProfileImage[]>([]);
    const [traits, setTraits] = useState<UserTrait[]>([]);
    const [interests, setInterests] = useState<Interest[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formState, setFormState] = useState({ name: '', location: '', bio: '', emojis: [] as string[] });
    const navigate = useNavigate();

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
                emojis: profileData.emojis || []
            });

            const { data: imagesData } = await supabase.from('user_profile_images').select('*').eq('user_id', profileData.id);
            if (imagesData) setProfileImages(imagesData);

            const { data: traitsData } = await supabase.from('user_traits').select('*').eq('user_id', profileData.id);
            if (traitsData) setTraits(traitsData);
            
            const { data: interestData } = await supabase.from('user_interests').select('interest:interests(id, name)').eq('user_id', profileData.id);
            if (interestData) setInterests(interestData.map((i: any) => i.interest));
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

    const handleEmojiSelect = (emoji: string) => {
        setFormState(prev => {
            const currentEmojis = prev.emojis;
            if (currentEmojis.includes(emoji)) {
                return { ...prev, emojis: currentEmojis.filter(e => e !== emoji) };
            } else if (currentEmojis.length < MAX_EMOJIS) {
                return { ...prev, emojis: [...currentEmojis, emoji] };
            }
            return prev;
        });
    };

    const handleSave = async () => {
        if (!user) return;
        setIsEditing(false);
        const { error: userError } = await supabase.from('users').update({
            name: formState.name,
            location: formState.location,
            bio: formState.bio,
            emojis: formState.emojis,
        }).eq('id', user.id);
        if (userError) console.error('Error updating user:', userError);

        await fetchProfile(); // Re-fetch to show saved data
    };
    
    const updateMainAvatar = async (images: ProfileImage[]) => {
        if (!user) return;
        const newAvatar = images.length > 0 ? images[0].image_url : `https://i.pravatar.cc/120?u=${user.auth_id}`;

        if (user.avatar_url !== newAvatar) {
            const { error } = await supabase.from('users').update({ avatar_url: newAvatar }).eq('id', user.id);
            if (!error) {
                setUser(prev => prev ? { ...prev, avatar_url: newAvatar } : null);
            } else {
                console.error("Failed to update main avatar:", error);
            }
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && user && profileImages.length < MAX_IMAGES) {
            const file = e.target.files[0];
            try {
                const imageUrl = await uploadFile(file);
                const { data: newImage, error } = await supabase
                    .from('user_profile_images')
                    .insert({ user_id: user.id, image_url: imageUrl })
                    .select()
                    .single();

                if (error) throw error;

                const updatedImages = [...profileImages, newImage as ProfileImage];
                setProfileImages(updatedImages);
                await updateMainAvatar(updatedImages);
            } catch (error) {
                console.error("Error uploading image:", error);
            }
        }
    };
    
    const handleImageDelete = async (imageId: number) => {
        const { error } = await supabase.from('user_profile_images').delete().eq('id', imageId);
        if (error) {
            console.error("Error deleting image:", error);
        } else {
            const updatedImages = profileImages.filter(img => img.id !== imageId);
            setProfileImages(updatedImages);
            await updateMainAvatar(updatedImages);
        }
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
            {/* Left Column / Top Section on Mobile */}
            <div className="lg:col-span-1 flex flex-col items-center text-center">
                 <div className="w-full max-w-sm mb-4">
                    <ProfileImageSlider 
                        images={profileImages}
                        isEditing={isEditing}
                        onDelete={handleImageDelete}
                        onAdd={handleImageUpload}
                    />
                </div>
                
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
                    {isEditing ? (
                        emojiOptions.slice(0, 3).map(e => (
                             <button key={e} type="button" onClick={() => handleEmojiSelect(e)} 
                                className={`text-3xl w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-200 ${formState.emojis.includes(e) ? 'bg-primary-light scale-110' : 'bg-gray-200 hover:bg-gray-300'}`}>
                                    {e}
                            </button>
                        ))
                    ) : (
                        (user.emojis || []).map((emoji, index) => (
                            <div key={index} className="w-16 h-16 rounded-full bg-primary-light dark:bg-primary/20 flex items-center justify-center text-3xl">{emoji}</div>
                        ))
                    )}
                </div>
                 <div className="w-full max-w-xs space-y-3">
                    {isEditing ? (
                        <button onClick={handleSave} className="flex items-center justify-center w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg">
                            <Save size={20} className="mr-2"/> Gem Profil
                        </button>
                    ) : (
                       <>
                            <button onClick={() => setIsEditing(true)} className="flex items-center justify-center w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg">
                                <Edit size={20} className="mr-2"/> Rediger Profil
                            </button>
                            <Link to="/friends" className="flex items-center justify-center w-full bg-primary-light text-primary dark:bg-dark-surface-light dark:text-dark-text-primary font-bold py-3 px-4 rounded-full text-lg hover:bg-primary/20 dark:hover:bg-dark-border transition duration-300">
                                <Users size={20} className="mr-2"/> Venner
                            </Link>
                            {user?.is_admin && (
                               <Link to="/admin" className="flex items-center justify-center w-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 font-bold py-3 px-4 rounded-full text-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition duration-300">
                                   <ShieldCheck size={20} className="mr-2"/> Admin Panel
                               </Link>
                           )}
                       </>
                    )}
                </div>
            </div>
            
            {/* Right Column / Bottom Section on Mobile */}
            <div className="lg:col-span-2 mt-8 lg:mt-0">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-3">Interesser</h2>
                    <div className="flex flex-wrap gap-2">
                        {interests.map(interest => (
                            <div key={interest.id} className="bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light font-semibold px-3 py-1.5 rounded-full text-sm">
                                {interest.name}
                            </div>
                        ))}
                         {isEditing && (
                            <button className="bg-gray-200 text-gray-600 font-semibold px-3 py-1.5 rounded-full text-sm hover:bg-gray-300">
                                + Tilføj
                            </button>
                        )}
                    </div>
                </div>
                
                <div>
                    <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-3">Personlighed</h2>
                    <p className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">{user.personality_type}</p>
                    {displayTraits.map(trait => (
                        <TraitSlider 
                            key={trait.label} 
                            trait={trait}
                        />
                    ))}
                    {!isEditing && (
                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={() => navigate('/personality-test')}
                                className="flex items-center justify-center w-full bg-primary-light text-primary dark:bg-dark-surface-light dark:text-dark-text-primary font-bold py-3 px-4 rounded-full text-lg hover:bg-primary/20 dark:hover:bg-dark-border transition duration-300"
                            >
                                <BrainCircuit size={20} className="mr-2"/> Tag testen igen
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;