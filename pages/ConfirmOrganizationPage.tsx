
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Camera, Building, Loader2, Search,
    Utensils, Dice5, MessagesSquare, Music, Paintbrush, Footprints, Bike, PartyPopper, Presentation, Wrench, Film, TreePine, LucideIcon, PenTool, FileText, Heart, Gem, Ship, Laptop, Scissors, Droplets, Flower, Hammer, Book, BookOpen, Circle, Dumbbell, Flower2, Mountain, PersonStanding, Swords, Sailboat, Waves, Snowflake, Flag, PawPrint, Gamepad2, Code, ToyBrick, Smartphone, Twitch, Trophy, Gamepad, Puzzle, Coffee, GlassWater, Beer, Cake, Leaf, Globe, Flame, Users, Backpack, Tent, Building2, Car, MapPin, Bird, Sprout, Fish, Star, HelpCircle, Store, Landmark, Megaphone, Baby, Languages, Guitar, Mic, Disc, Palette, Scroll, Theater, Construction, MoveVertical, PlusCircle, Sparkles, X, ChevronDown
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { uploadFile } from '../services/s3Service';
import TagSelector from '../components/TagSelector';
import type { Activity, Interest, InterestCategory } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

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
  logoUploadConfirmation: '',
};

const iconMap: { [key: string]: LucideIcon } = {
    Utensils, Dice5, MessagesSquare, Music, Paintbrush, Footprints, Bike, PartyPopper, Presentation, Wrench, Film, TreePine, PenTool, Camera, FileText, Heart, Gem, Ship, Laptop, Scissors, Droplets, Flower, Hammer, Book, BookOpen, Circle, Dumbbell, Flower2, Mountain, PersonStanding, Swords, Sailboat, Waves, Snowflake, Flag, PawPrint, Gamepad2, Code, ToyBrick, Smartphone, Twitch, Trophy, Gamepad, Puzzle, Coffee, GlassWater, Beer, Cake, Leaf, Globe, Flame, Users, Backpack, Tent, Building2, Car, MapPin, Bird, Sprout, Fish, Star, HelpCircle, Store, Landmark, Megaphone, Baby, Languages, Guitar, Mic, Disc, Palette, Scroll, Theater, Construction, MoveVertical
};

const SuggestionInfoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
    >
        <motion.div
            className="bg-white dark:bg-dark-surface rounded-2xl p-6 w-full max-w-sm text-center relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="mx-auto inline-block bg-primary-light dark:bg-primary/20 text-primary p-3 rounded-full mb-4">
                <Sparkles size={32} strokeWidth={2} />
            </div>
            <p className="text-text-secondary dark:text-dark-text-secondary text-base mb-6">
                ✨ Opret en profil for at kunne foreslå nye tags – eller få smarte AI-forslag ud fra jeres organisationsbeskrivelse.
                <br/><br/>
                👉 Når profilen er oprettet, finder du det hele under Indstillinger.
            </p>
            <button
                onClick={onClose}
                className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
            >
                Forstået
            </button>
        </motion.div>
    </motion.div>
);


const ConfirmOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isManual = !!location.state?.manual;

  const [formData, setFormData] = useState(emptyData);
  
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

  // New state for activity search and suggestion
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [isSuggestingActivity, setIsSuggestingActivity] = useState(false);
  const [visibleActivitiesCount, setVisibleActivitiesCount] = useState(12);


  // State for the new info modal
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);

  const fetchActivities = async () => {
    const { data: activitiesData } = await supabase.from('activities').select('*').order('name');
    setAllActivities(activitiesData || []);
  };

  useEffect(() => {
    const fetchData = async () => {
        fetchActivities();
        const { data: iCatData } = await supabase.from('interest_categories').select('*').order('name');
        const { data: iData } = await supabase.from('interests').select('*');
        setInterestCategories(iCatData || []);
        setAllInterests(iData || []);
    };
    fetchData();
  }, []);
  
  const filteredActivities = useMemo(() => {
    const searchFiltered = activitySearchTerm
        ? allActivities.filter(activity =>
            activity.name.toLowerCase().includes(activitySearchTerm.toLowerCase())
          )
        : allActivities;
    return searchFiltered.slice(0, visibleActivitiesCount);
  }, [allActivities, activitySearchTerm, visibleActivitiesCount]);

  const totalFilteredCount = useMemo(() => {
     if (!activitySearchTerm) return allActivities.length;
     return allActivities.filter(activity =>
        activity.name.toLowerCase().includes(activitySearchTerm.toLowerCase())
    ).length;
  }, [allActivities, activitySearchTerm]);


  const handleSuggestActivity = async () => {
    setIsSuggestionModalOpen(true);
  };

  const handleSuggestInterest = async (tagName: string, categoryId: number): Promise<Interest | null> => {
    setIsSuggestionModalOpen(true);
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setFormData(prev => ({ ...prev, logoUploadConfirmation: "Organisationslogo uploadet 👌" }));

        try {
            const finalUrl = await uploadFile(file);
            setFormData(prev => ({ ...prev, logo_url: finalUrl }));
        } catch (err) {
            setError('Billedupload fejlede. Prøv igen.');
            setFormData(prev => ({ ...prev, logo_url: '', logoUploadConfirmation: "" }));
        }
    }
};

 const handleSignupAndCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // 1. Sign up the organization user
    // FIX: Updated `signUp` to use the older two-argument syntax for metadata, ensuring compatibility.
    const { data: authData, error: signUpError } = await (supabase.auth as any).signUp(
      {
        email: email,
        password: password,
      },
      {
        data: {
          is_organization: true,
          full_name: formData.name,
          host_name: formData.host_name,
        },
      }
    );

    if (signUpError) {
      setError(`Fejl ved oprettelse: ${signUpError.message}`);
      setLoading(false);
      return;
    }

    if (!authData.user) {
        setError('Kunne ikke oprette bruger. Prøv venligst igen.');
        setLoading(false);
        return;
    }
    
    // 2. Update the organization's profile with all the form data
    const { data: orgData, error: orgUpdateError } = await supabase
      .from('organizations')
      .update({
        name: formData.name,
        phone: formData.phone,
        website: formData.website,
        address: formData.address,
        organization_type: formData.organization_type,
        facebook_url: formData.facebook_url,
        description: formData.description,
        logo_url: formData.logo_url,
        host_name: formData.host_name,
        emojis: selectedInterests.map(i => i.name)
      })
      .eq('auth_id', authData.user.id)
      .select()
      .single();

    if (orgUpdateError) {
      setError(`Kunne ikke opdatere organisationsprofil: ${orgUpdateError.message}`);
      setLoading(false);
      return;
    }
    
    if (!orgData) {
        setError('Kunne ikke finde den nyoprettede organisation.');
        setLoading(false);
        return;
    }

    // 3. Create the host user profile by calling the secure RPC function to bypass RLS
    if (formData.host_name.trim()) {
        const { error: rpcError } = await supabase.rpc('create_host_user_for_organization', {
            p_host_name: formData.host_name,
            p_avatar_url: formData.logo_url || null,
            p_address: formData.address,
            p_org_name: formData.name
        });

        if (rpcError) {
            // Log the error but don't block the user. The org profile was created.
            console.error("Warning: Could not create host user profile:", rpcError.message);
        }
    }
    
    // 4. Link activities
    if (selectedActivityIds.length > 0) {
        const linksToInsert = selectedActivityIds.map(id => ({
            organization_id: orgData.id,
            activity_id: id
        }));
        await supabase.from('organization_activities').insert(linksToInsert);
    }
    
    setMessage('Organisation oprettet! Logger ind...');
    // FIX: Replaced `signInWithPassword` with `signIn` for compatibility with older Supabase v2 versions.
    const { error: signInError } = await (supabase.auth as any).signIn({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
    // On success, AuthContext will handle navigation
  };


  return (
    <>
    <AnimatePresence>
        {isSuggestionModalOpen && <SuggestionInfoModal onClose={() => setIsSuggestionModalOpen(false)} />}
    </AnimatePresence>
    <div className="min-h-screen w-full bg-gray-50 dark:bg-dark-background">
      <header className="p-6 self-start flex justify-between items-center w-full">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
        <div className="w-8"></div>
      </header>

      <main className="w-full flex justify-center px-4 pb-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Opret Organisationsprofil</h2>
            <p className="text-text-secondary dark:text-dark-text-secondary mt-2">
              Fortæl os om jeres organisation for at blive en del af SoulMatch fællesskabet.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSignupAndCreateOrg}>
            {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
            {message && <p className="text-green-500 text-center bg-green-100 p-3 rounded-lg text-sm">{message}</p>}
            
            {/* Logo Upload */}
            <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm flex flex-col items-center">
                 <label htmlFor="logo-upload" className="font-semibold text-text-primary dark:text-dark-text-primary mb-3">Jeres Logo</label>
                 <div 
                    onClick={() => logoInputRef.current?.click()}
                    className="relative group w-32 h-32 rounded-full bg-gray-100 dark:bg-dark-surface-light flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 dark:border-dark-border hover:border-primary transition-colors"
                >
                    {formData.logoUploadConfirmation ? (
                        <div className="text-center text-green-600 font-bold p-2 text-sm">
                            {formData.logoUploadConfirmation}
                        </div>
                    ) : (
                         <Camera size={40} className="text-gray-400 group-hover:text-primary transition-colors" />
                    )}
                     <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        Skift logo
                    </div>
                </div>
                 <input type="file" ref={logoInputRef} id="logo-upload" onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>

            {/* Basic Info */}
            <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold mb-4">Grundlæggende Information</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="name" placeholder="Navn på organisation" value={formData.name} onChange={handleInputChange} className="input-style" required />
                    <input name="organization_type" placeholder="Type (f.eks. NGO, Forening)" value={formData.organization_type} onChange={handleInputChange} className="input-style" />
                    <input name="host_name" placeholder="Værtens fulde navn" value={formData.host_name} onChange={handleInputChange} className="input-style" required />
                    <input name="address" placeholder="Adresse" value={formData.address} onChange={handleInputChange} className="input-style" required />
                    <input name="phone" type="tel" placeholder="Telefonnummer" value={formData.phone} onChange={handleInputChange} className="input-style" />
                    <input name="email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-style" required autoComplete="email"/>
                    <input name="website" type="url" placeholder="Hjemmeside (valgfrit)" value={formData.website} onChange={handleInputChange} className="input-style" />
                    <input name="facebook_url" type="url" placeholder="Facebook URL (valgfrit)" value={formData.facebook_url} onChange={handleInputChange} className="input-style" />
                 </div>
                 <textarea name="description" placeholder="Kort beskrivelse af jeres organisation..." value={formData.description} onChange={handleInputChange} rows={4} className="input-style w-full mt-4" required></textarea>
            </div>

            {/* Activities */}
            <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold mb-4">Vælg jeres primære aktiviteter</h3>
                <div className="relative mb-4">
                    <input type="text" placeholder="Søg eller foreslå en aktivitet..." value={activitySearchTerm} onChange={(e) => {setActivitySearchTerm(e.target.value); setVisibleActivitiesCount(12);}} className="input-style w-full pl-10"/>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </div>
                 <div className="flex flex-wrap gap-2">
                     {filteredActivities.map(activity => {
                        const IconComponent = iconMap[activity.icon] || Building;
                        const isSelected = selectedActivityIds.includes(activity.id);
                        return (
                            <button type="button" key={activity.id} onClick={() => setSelectedActivityIds(prev => isSelected ? prev.filter(id => id !== activity.id) : [...prev, activity.id])} className={`flex items-center px-3 py-2 rounded-full text-sm border-2 transition ${isSelected ? 'bg-primary-light dark:bg-primary/20 border-primary font-semibold' : 'bg-gray-100 dark:bg-dark-surface-light border-transparent hover:border-gray-300'}`}>
                                <IconComponent size={16} className="mr-2 flex-shrink-0" />
                                {activity.name}
                            </button>
                        );
                    })}
                     {activitySearchTerm.trim() && filteredActivities.length === 0 && (
                        <button type="button" onClick={handleSuggestActivity} disabled={isSuggestingActivity} className="w-full flex items-center justify-center p-3 rounded-lg bg-green-100 text-green-800 font-semibold hover:bg-green-200 transition-colors disabled:opacity-70">
                            {isSuggestingActivity ? <Loader2 size={18} className="animate-spin mr-2"/> : <PlusCircle size={18} className="mr-2"/>}
                            Foreslå "{activitySearchTerm.trim()}"
                        </button>
                    )}
                </div>
                 {visibleActivitiesCount < totalFilteredCount && (
                    <button type="button" onClick={() => setVisibleActivitiesCount(c => c + 12)} className="w-full text-center text-sm font-semibold text-primary py-2 mt-4 flex items-center justify-center">
                        Vis flere <ChevronDown size={16} className="ml-1"/>
                    </button>
                )}
            </div>

            {/* Interests */}
            <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                <TagSelector
                    title="Beskriv jer med interesser"
                    categories={interestCategories}
                    allTags={allInterests}
                    selectedTags={selectedInterests}
                    onToggleTag={(tag) => setSelectedInterests(prev => prev.some(i => i.id === tag.id) ? prev.filter(i => i.id !== tag.id) : [...prev, tag as Interest])}
                    containerHeight="h-auto"
                    allowSuggestions={true}
                    onSuggestTag={handleSuggestInterest}
                />
            </div>

            {/* Account Creation */}
            <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                 <h3 className="text-lg font-bold mb-4">Opret Administrator Konto</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="password" placeholder="Vælg en adgangskode" value={password} onChange={(e) => setPassword(e.target.value)} className="input-style" required autoComplete="new-password"/>
                    <input type="password" placeholder="Bekræft adgangskode" className="input-style" required autoComplete="new-password"/>
                 </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50 flex items-center justify-center"
              >
                {loading && <Loader2 className="animate-spin mr-2"/>}
                {loading ? 'Opretter...' : 'Opret Organisation & Log ind'}
              </button>
            </div>
          </form>
        </div>
      </main>
      <style>{`
         .input-style { display: block; width: 100%; padding: 0.75rem 1rem; color: #212529; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.5rem; } 
         .dark .input-style { background-color: #2a3343; border-color: #3c465b; color: #e2e8f0; }
      `}</style>
    </div>
    </>
  );
};

export default ConfirmOrganizationPage;