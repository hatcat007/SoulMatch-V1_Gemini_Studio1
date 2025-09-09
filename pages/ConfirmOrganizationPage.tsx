import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Camera, Building, Loader2, Search,
    Utensils, Dice5, MessagesSquare, Music, Paintbrush, Footprints, Bike, PartyPopper, Presentation, Wrench, Film, TreePine, LucideIcon, PenTool, FileText, Heart, Gem, Ship, Laptop, Scissors, Droplets, Flower, Hammer, Book, BookOpen, Circle, Dumbbell, Flower2, Mountain, PersonStanding, Swords, Sailboat, Waves, Snowflake, Flag, PawPrint, Gamepad2, Code, ToyBrick, Smartphone, Twitch, Trophy, Gamepad, Puzzle, Coffee, GlassWater, Beer, Cake, Leaf, Globe, Flame, Users, Backpack, Tent, Building2, Car, MapPin, Bird, Sprout, Fish, Star, HelpCircle, Store, Landmark, Megaphone, Baby, Languages, Guitar, Mic, Disc, Palette, Scroll, Theater, Construction, MoveVertical
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { uploadFile, fetchPrivateFile } from '../services/s3Service';
import TagSelector from '../components/TagSelector';
import type { Activity, Interest, InterestCategory } from '../types';

const prefilledData = {
  name: 'SIND Ungdom Aalborg',
  phone: '+45 2323112',
  website: 'sindungdom.dk',
  address: 'Danmarksgade 52, 9000 Aalborg',
  organization_type: 'NGO forening',
  facebook_url: 'Facebook.com/sindungdomaalborg',
  description: 'SIND Ungdom i Aalborg er et klubtilbud for unge psykisk sårbare i alderen 16-35 år.',
  logo_url: 'https://i.imgur.com/8S8V5c2.png',
  host_name: 'Jette Jensen',
};

const emptyData = {
  name: '',
  phone: '',
  website: '',
  address: '',
  organization_type: '',
  facebook_url: '',
  description: '',
  logo_url: '',
  host_name: '',
};

const iconMap: { [key: string]: LucideIcon } = {
    Utensils, Dice5, MessagesSquare, Music, Paintbrush, Footprints, Bike, PartyPopper, Presentation, Wrench, Film, TreePine, PenTool, Camera, FileText, Heart, Gem, Ship, Laptop, Scissors, Droplets, Flower, Hammer, Book, BookOpen, Circle, Dumbbell, Flower2, Mountain, PersonStanding, Swords, Sailboat, Waves, Snowflake, Flag, PawPrint, Gamepad2, Code, ToyBrick, Smartphone, Twitch, Trophy, Gamepad, Puzzle, Coffee, GlassWater, Beer, Cake, Leaf, Globe, Flame, Users, Backpack, Tent, Building2, Car, MapPin, Bird, Sprout, Fish, Star, HelpCircle, Store, Landmark, Megaphone, Baby, Languages, Guitar, Mic, Disc, Palette, Scroll, Theater, Construction, MoveVertical
};

const SmartImage: React.FC<{ src: string; alt: string; className: string; fallback: React.ReactNode; }> = ({ src, alt, className, fallback }) => {
    const [displayUrl, setDisplayUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let objectUrlToRevoke: string | null = null;
        let isMounted = true;

        const processUrl = async () => {
            if (!src) {
                if (isMounted) { setIsLoading(false); setDisplayUrl(''); }
                return;
            }
            setIsLoading(true);
            if (src.startsWith('blob:') || src.startsWith('http')) {
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
        return () => { isMounted = false; if (objectUrlToRevoke) { URL.revokeObjectURL(objectUrlToRevoke); } };
    }, [src]);

    if (isLoading) return <div className={`${className} flex items-center justify-center`}><Loader2 className="animate-spin text-gray-400" /></div>;
    if (!displayUrl) return <div className={`${className} flex items-center justify-center`}>{fallback}</div>;
    return <img src={displayUrl} alt={alt} className={className} />;
};


const ConfirmOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isManual = !!location.state?.manual;

  const [formData, setFormData] = useState(isManual ? emptyData : prefilledData);
  
  // State for activities and interests
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [selectedActivityIds, setSelectedActivityIds] = useState<number[]>([]);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // New state for activity search and pagination
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [visibleActivityCount, setVisibleActivityCount] = useState(6);

  useEffect(() => {
    const fetchData = async () => {
        const { data: activitiesData } = await supabase.from('activities').select('*').order('name');
        setAllActivities(activitiesData || []);
        
        const { data: iCatData } = await supabase.from('interest_categories').select('*').order('name');
        const { data: iData } = await supabase.from('interests').select('*');
        setInterestCategories(iCatData || []);
        setAllInterests(iData || []);
    };
    fetchData();
  }, []);
  
  const handleActivitySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActivitySearchTerm(e.target.value);
    setVisibleActivityCount(6); // Reset pagination on new search
  };

  const filteredActivities = useMemo(() => {
    if (!activitySearchTerm) {
        return allActivities;
    }
    return allActivities.filter(activity =>
        activity.name.toLowerCase().includes(activitySearchTerm.toLowerCase())
    );
  }, [allActivities, activitySearchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url') => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const previewUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, [field]: previewUrl })); // Show preview immediately
        
        try {
            const finalUrl = await uploadFile(file);
            setFormData(prev => ({ ...prev, [field]: finalUrl }));
        } catch (err) {
            setError('Image upload failed. Please try again.');
            setFormData(prev => ({ ...prev, [field]: '' })); // Clear on error
        } finally {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        }
    }
  };

  const handleActivitySelect = (activityId: number) => {
    setSelectedActivityIds(prev =>
        prev.includes(activityId)
            ? prev.filter(id => id !== activityId)
            : [...prev, activityId]
    );
  };

  const handleInterestToggle = (interest: Interest) => {
    setSelectedInterests(prev =>
        prev.some(i => i.id === interest.id)
            ? prev.filter(i => i.id !== interest.id)
            : [...prev, interest]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: formData.name, is_organization: true } }
    });

    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    if (signUpData.user && signUpData.user.identities?.length === 0) { setMessage('User exists. Please log in.'); setLoading(false); return; }

    if (signUpData.user) {
        // Fetch the organization ID that the trigger created
        const { data: orgProfile, error: orgFetchError } = await supabase
            .from('organizations')
            .select('id')
            .eq('auth_id', signUpData.user.id)
            .single();

        if (orgFetchError || !orgProfile) {
            setError(`Account created, but could not find organization profile: ${orgFetchError?.message}`);
            setLoading(false);
            return;
        }
        const organizationId = orgProfile.id;

        // Update profile, repurposing `emojis` column for interest names
        const { error: updateError } = await supabase.from('organizations').update({
            name: formData.name,
            logo_url: formData.logo_url,
            address: formData.address,
            description: formData.description,
            phone: formData.phone,
            email: email,
            website: formData.website,
            host_name: formData.host_name,
            organization_type: formData.organization_type,
            facebook_url: formData.facebook_url,
            emojis: selectedInterests.map(i => i.name),
        }).eq('id', organizationId);

        if (updateError) {
             setError(`Account created, but failed to update profile: ${updateError.message}`);
             setLoading(false);
             return;
        }

        // Sync activities
        await supabase.from('organization_activities').delete().eq('organization_id', organizationId);
        if (selectedActivityIds.length > 0) {
            const linksToInsert = selectedActivityIds.map(id => ({ organization_id: organizationId, activity_id: id }));
            await supabase.from('organization_activities').insert(linksToInsert);
        }
    }
    
    if (signUpData.session) {
        setMessage('Success! Profile created. Logging you in...');
        setTimeout(() => { window.location.hash = '/dashboard'; window.location.reload(); }, 2000);
    } else {
        setMessage('Check your email to confirm your organization account.');
    }
    setLoading(false);
  };
  
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-gray-50 dark:bg-dark-background">
        <style>{`
            .input-style { 
                display: block; width: 100%; padding: 0.75rem 1rem;
                color: #212529; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.5rem; 
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .input-style:focus {
                outline: none; border-color: #006B76;
                box-shadow: 0 0 0 2px rgba(0, 107, 118, 0.2);
            }
            .dark .input-style { 
                background-color: #2a3343; border-color: #3c465b; color: #e2e8f0; 
            }
            .dark .input-style:focus {
                border-color: #E6F0F1;
                box-shadow: 0 0 0 2px rgba(230, 240, 241, 0.2);
            }
            label {
                display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500;
                color: #4B5563;
            }
            .dark label {
                color: #9CA3AF;
            }
        `}</style>

        {/* Left decorative panel */}
        <div className="hidden lg:flex flex-col items-center justify-center bg-primary-light dark:bg-dark-surface p-12 text-center">
            <h1 className="text-4xl font-bold text-primary mb-8">SoulMatch</h1>
            <div className="relative w-64 h-64 flex items-center justify-center">
                <div className="absolute w-full h-full bg-white dark:bg-dark-surface-light rounded-full"></div>
                <Building size={128} className="text-primary z-10" strokeWidth={1.5}/>
            </div>
            <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-12">Bliv en del af fællesskabet</h2>
            <p className="text-text-secondary dark:text-dark-text-secondary text-lg mt-4 max-w-sm">
                Opret en profil for din organisation og vær med til at skabe meningsfulde events og tilbud.
            </p>
        </div>

        {/* Right form panel */}
        <div className="flex flex-col justify-start items-center p-4 sm:p-6 lg:p-8 h-screen overflow-y-auto">
            <div className="w-full max-w-2xl">
                 <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary mb-4">
                    <ArrowLeft size={24} />
                </button>
                <form onSubmit={handleSubmit} className="w-full bg-white dark:bg-dark-surface p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Opret Organisationsprofil</h2>
                        <p className="text-text-secondary dark:text-dark-text-secondary mt-2">
                            {isManual ? "Udfyld venligst oplysningerne manuelt." : "Bekræft de indhentede oplysninger."}
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <label className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Organisationslogo</label>
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-dark-surface-light flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-dark-border">
                                <SmartImage 
                                    src={formData.logo_url} 
                                    alt="Organization logo" 
                                    className="w-full h-full object-cover" 
                                    fallback={<Building size={64} className="text-gray-400 dark:text-gray-500" />} 
                                />
                            </div>
                            <input type="file" ref={logoInputRef} onChange={(e) => handleImageUpload(e, 'logo_url')} accept="image/*" className="hidden" />
                            <button 
                                type="button" 
                                onClick={() => logoInputRef.current?.click()}
                                className="absolute inset-0 w-full h-full bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Camera size={24} />
                                <span className="text-sm font-semibold mt-1">Skift logo</span>
                            </button>
                        </div>
                    </div>
                    
                    <section className="space-y-4">
                        <h3 className="text-xl font-bold border-b pb-2 dark:border-dark-border text-text-primary dark:text-dark-text-primary">Grundlæggende Oplysninger</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label htmlFor="name">Navn på organisation</label><input id="name" name="name" value={formData.name} onChange={handleInputChange} className="input-style" required /></div>
                            <div><label htmlFor="organization_type">Type (f.eks. NGO, Café)</label><input id="organization_type" name="organization_type" value={formData.organization_type} onChange={handleInputChange} className="input-style" /></div>
                        </div>
                        <div><label htmlFor="host_name">Værtens navn</label><input id="host_name" name="host_name" value={formData.host_name} onChange={handleInputChange} className="input-style" /></div>
                    </section>

                    <section><h3 className="text-xl font-bold border-b pb-2 dark:border-dark-border text-text-primary dark:text-dark-text-primary">Beskrivelse</h3><textarea id="description" name="description" placeholder="Fortæl om jeres organisation..." rows={4} value={formData.description} onChange={handleInputChange} className="input-style mt-3 w-full" required></textarea></section>

                    <section className="space-y-4">
                        <h3 className="text-xl font-bold border-b pb-2 dark:border-dark-border text-text-primary dark:text-dark-text-primary">Kontaktinformation</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label htmlFor="phone">Telefon</label><input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} className="input-style" /></div>
                            <div><label htmlFor="address">Adresse</label><input id="address" name="address" value={formData.address} onChange={handleInputChange} className="input-style" /></div>
                            <div><label htmlFor="website">Hjemmeside</label><input id="website" name="website" value={formData.website} onChange={handleInputChange} className="input-style" /></div>
                            <div><label htmlFor="facebook_url">Facebook URL</label><input id="facebook_url" name="facebook_url" value={formData.facebook_url} onChange={handleInputChange} className="input-style" /></div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold border-b pb-2 dark:border-dark-border text-text-primary dark:text-dark-text-primary mb-3">Vælg jeres primære aktiviteter</h3>
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Søg i aktiviteter..."
                                value={activitySearchTerm}
                                onChange={handleActivitySearchChange}
                                className="input-style w-full pl-10"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        </div>
                        <div className="flex flex-wrap gap-3">
                           {filteredActivities.slice(0, visibleActivityCount).map(activity => {
                                const IconComponent = iconMap[activity.icon] || Building;
                                const isSelected = selectedActivityIds.includes(activity.id);
                                return (
                                    <button type="button" key={activity.id} onClick={() => handleActivitySelect(activity.id)}
                                        className={`flex items-center px-4 py-2 rounded-full border-2 transition-transform duration-200 active:scale-95 ${isSelected ? 'bg-primary-light dark:bg-primary/20 border-primary font-semibold' : 'bg-gray-100 dark:bg-dark-surface-light border-transparent hover:border-gray-300'}`}>
                                        <IconComponent size={18} className="mr-2" />
                                        {activity.name}
                                    </button>
                                );
                           })}
                        </div>
                        {visibleActivityCount < filteredActivities.length && (
                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => setVisibleActivityCount(prev => prev + 6)}
                                    className="text-primary font-semibold hover:underline"
                                >
                                    Vis flere
                                </button>
                            </div>
                        )}
                    </section>

                    <section>
                        <TagSelector
                            title="Vælg interesser der beskriver jer"
                            categories={interestCategories}
                            allTags={allInterests}
                            selectedTags={selectedInterests}
                            onToggleTag={handleInterestToggle}
                            containerHeight="h-auto"
                        />
                    </section>

                    <hr className="dark:border-dark-border" />
                    <section className="space-y-4">
                        <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Opret administrator-konto</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label htmlFor="email">Admin Email</label><input id="email" type="email" placeholder="din@email.com" value={email} onChange={e => setEmail(e.target.value)} className="input-style" required /></div>
                            <div><label htmlFor="password">Admin Adgangskode</label><input id="password" type="password" placeholder="********" value={password} onChange={e => setPassword(e.target.value)} className="input-style" required /></div>
                        </div>
                    </section>

                    {error && <p className="text-red-500 text-center bg-red-100 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm">{error}</p>}
                    {message && <p className="text-green-500 text-center bg-green-100 dark:bg-green-900/20 dark:text-green-400 p-3 rounded-lg text-sm">{message}</p>}

                    <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50">
                        {loading ? 'Opretter...' : 'Opret Profil og Fortsæt'}
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};

export default ConfirmOrganizationPage;