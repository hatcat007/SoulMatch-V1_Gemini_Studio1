import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import type { Organization, Activity, Interest, InterestCategory, PersonalityTag } from '../../types';
import { uploadFile, fetchPrivateFile } from '../../services/s3Service';
// FIX: Replaced non-existent lucide-react icons with valid alternatives and added missing FileText import.
// FIX: Import LucideIcon type to correctly type the icon map and resolve prop errors.
import { Save, Loader2, Camera, Building, Utensils, Dice5, MessagesSquare, Music, Paintbrush, Footprints, Bike, PartyPopper, Presentation, Wrench, Film, TreePine, LucideIcon, Search, Gem, Ship, Laptop, Scissors, Droplets, Flower, Hammer, Book, BookOpen, Circle, Dumbbell, Mountain, PersonStanding, Swords, Sailboat, Waves, Snowflake, Gamepad2, Code, ToyBrick, Smartphone, Twitch, Trophy, Gamepad, Puzzle, Coffee, GlassWater, Beer, Cake, Leaf, Globe, Flame, Users, Backpack, Tent, Building2, Car, MapPin, Bird, Sprout, Fish, Star, HelpCircle, Store, Landmark, Megaphone, Baby, Languages, Guitar, Mic, Disc, Palette, Scroll, Theater, PenTool, Heart, MoveVertical, FileText, Flag, Flower2, PawPrint, Construction } from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
import TagSelector from '../../components/TagSelector';

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
    if (!displayUrl) return <div className={className}>{fallback}</div>;
    return <img src={displayUrl} alt={alt} className={className} />;
};

// FIX: Updated icon map to match the corrected icon imports.
// FIX: Use LucideIcon type for the icon map to ensure props like `size` are recognized.
const iconMap: { [key: string]: LucideIcon } = {
    Utensils, Dice5, MessagesSquare, Music, Paintbrush, Footprints, Bike, PartyPopper, Presentation, Wrench, Film, TreePine, PenTool, Camera, FileText, Heart, Gem, Ship, Laptop, Scissors, Droplets, Flower, Hammer, Book, BookOpen, Circle, Dumbbell, Flower2, Mountain, PersonStanding, Swords, Sailboat, Waves, Snowflake, Flag, PawPrint, Gamepad2, Code, ToyBrick, Smartphone, Twitch, Trophy, Gamepad, Puzzle, Coffee, GlassWater, Beer, Cake, Leaf, Globe, Flame, Users, Backpack, Tent, Building2, Car, MapPin, Bird, Sprout, Fish, Star, HelpCircle, Store, Landmark, Megaphone, Baby, Languages, Guitar, Mic, Disc, Palette, Scroll, Theater, Construction, MoveVertical
};

const OrganizationSettingsPage: React.FC = () => {
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    const [formData, setFormData] = useState<Partial<Organization>>({});
    
    // Activities State
    const [allActivities, setAllActivities] = useState<Activity[]>([]);
    const [selectedActivityIds, setSelectedActivityIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Interests State
    const [allInterests, setAllInterests] = useState<Interest[]>([]);
    const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);

    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchOrganizationData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('Bruger ikke fundet.'); setLoading(false); return;
            }

            const { data: orgData, error: orgError } = await supabase.from('organizations').select('*').eq('auth_id', user.id).single();
            if (orgError || !orgData) {
                setError('Kunne ikke hente organisationsdata.'); setLoading(false); return;
            }
            
            setOrganization(orgData);
            setFormData(orgData);

            // Fetch activities
            const { data: activitiesData } = await supabase.from('activities').select('*').order('name');
            setAllActivities(activitiesData || []);
            const { data: selectedLinks } = await supabase.from('organization_activities').select('activity_id').eq('organization_id', orgData.id);
            setSelectedActivityIds(selectedLinks?.map(link => link.activity_id) || []);
            
            // Fetch interests
            const { data: iCatData } = await supabase.from('interest_categories').select('*').order('name');
            const { data: iData } = await supabase.from('interests').select('*').order('name');
            setInterestCategories(iCatData || []);
            setAllInterests(iData || []);

            if (orgData.emojis && iData) {
                const initialSelectedInterests = iData.filter(i => (orgData.emojis || []).includes(i.name));
                setSelectedInterests(initialSelectedInterests);
            }
            
            setLoading(false);
        };
        fetchOrganizationData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const previewUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, [field]: previewUrl }));
            
            try {
                const finalUrl = await uploadFile(file);
                setFormData(prev => ({ ...prev, [field]: finalUrl }));
            } catch (err) {
                setError('Billedupload fejlede. Prøv igen.');
                setFormData(prev => ({ ...prev, [field]: organization?.[field] || '' }));
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
        setSelectedInterests(prev => {
            const isSelected = prev.some(i => i.id === interest.id);
            if (isSelected) {
                return prev.filter(i => i.id !== interest.id);
            } else {
                return [...prev, interest];
            }
        });
    };

    const handleSave = async () => {
        if (!organization) return;
        setSaving(true);
        setError(null);
        setSuccessMessage(null);
        
        const interestNames = selectedInterests.map(i => i.name);
        const { emojis, ...profileData } = formData;
        const dataToUpdate = { ...profileData, emojis: interestNames };

        const { error: updateError } = await supabase
            .from('organizations')
            .update(dataToUpdate)
            .eq('id', organization.id);

        if (updateError) {
            setError(updateError.message); setSaving(false); return;
        }

        const { error: deleteError } = await supabase.from('organization_activities').delete().eq('organization_id', organization.id);
        if (deleteError) {
             setError(`Profil opdateret, men kunne ikke opdatere aktiviteter: ${deleteError.message}`); setSaving(false); return;
        }

        if (selectedActivityIds.length > 0) {
            const linksToInsert = selectedActivityIds.map(id => ({
                organization_id: organization.id,
                activity_id: id
            }));
            const { error: insertError } = await supabase.from('organization_activities').insert(linksToInsert);
            if (insertError) {
                setError(`Profil opdateret, men kunne ikke gemme nye aktiviteter: ${insertError.message}`); setSaving(false); return;
            }
        }
        
        setSuccessMessage('Profil opdateret!');
        setTimeout(() => setSuccessMessage(null), 3000);
        setSaving(false);
    };

    if (loading) return <LoadingScreen message="Indlæser indstillinger..." />;
    if (!organization) return <div className="p-8 text-center text-red-500">Kunne ikke finde organisationsdata.</div>;
    
    const filteredActivities = allActivities.filter(activity =>
        activity.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Indstillinger</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Rediger din organisations offentlige profil.</p>
            
            <div className="max-w-4xl mx-auto bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm space-y-6">
                {error && <p className="text-red-500 text-center bg-red-100 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm">{error}</p>}
                {successMessage && <p className="text-green-600 text-center bg-green-100 dark:bg-green-900/20 dark:text-green-400 p-3 rounded-lg text-sm">{successMessage}</p>}

                <div className="flex flex-col items-center border-b pb-6 dark:border-dark-border">
                    <label className="font-semibold mb-2">Logo</label>
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-2 overflow-hidden border">
                       <SmartImage src={formData.logo_url || ''} alt="Logo" className="w-full h-full object-cover" fallback={<Building size={48} className="text-gray-400" />} />
                    </div>
                    <input type="file" ref={logoInputRef} onChange={(e) => handleImageUpload(e, 'logo_url')} className="hidden" />
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="text-sm font-semibold text-primary hover:underline"><Camera size={16} className="inline mr-1"/> Skift logo</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label>Navn</label><input name="name" value={formData.name || ''} onChange={handleInputChange} className="input-style" /></div>
                    <div><label>Type</label><input name="organization_type" value={formData.organization_type || ''} onChange={handleInputChange} className="input-style" /></div>
                    <div><label>Værtens navn</label><input name="host_name" value={formData.host_name || ''} onChange={handleInputChange} className="input-style" /></div>
                    <div><label>Telefon</label><input name="phone" value={formData.phone || ''} onChange={handleInputChange} className="input-style" /></div>
                    <div><label>Email</label><input name="email" type="email" value={formData.email || ''} onChange={handleInputChange} className="input-style" /></div>
                    <div><label>Adresse</label><input name="address" value={formData.address || ''} onChange={handleInputChange} className="input-style" /></div>
                    <div><label>Hjemmeside</label><input name="website" value={formData.website || ''} onChange={handleInputChange} className="input-style" /></div>
                    <div><label>Facebook URL</label><input name="facebook_url" value={formData.facebook_url || ''} onChange={handleInputChange} className="input-style" /></div>
                </div>
                <div><label>Beskrivelse</label><textarea name="description" rows={4} value={formData.description || ''} onChange={handleInputChange} className="input-style w-full"></textarea></div>

                <div>
                    <h3 className="text-lg font-semibold mb-2">Vælg jeres primære aktiviteter</h3>
                     <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Søg i aktiviteter..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-style w-full pl-10"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                    <div className="max-h-60 overflow-y-auto flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-dark-surface-light rounded-md">
                         {filteredActivities.map(activity => {
                            const IconComponent = iconMap[activity.icon] || Building;
                            const isSelected = selectedActivityIds.includes(activity.id);
                            return (
                                <button
                                    type="button"
                                    key={activity.id}
                                    onClick={() => handleActivitySelect(activity.id)}
                                    className={`flex items-center px-3 py-2 rounded-full text-sm border-2 transition ${isSelected ? 'bg-primary-light dark:bg-primary/20 border-primary font-semibold' : 'bg-gray-100 dark:bg-dark-surface-light border-transparent hover:border-gray-300'}`}
                                >
                                    {IconComponent && <IconComponent size={16} className="mr-2 flex-shrink-0" />}
                                    {activity.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <TagSelector
                        title="Vælg interesser der beskriver jer"
                        categories={interestCategories}
                        allTags={allInterests}
                        selectedTags={selectedInterests}
                        onToggleTag={handleInterestToggle as (tag: Interest | PersonalityTag) => void}
                        containerHeight="h-auto"
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <button onClick={handleSave} disabled={saving} className="flex items-center justify-center bg-primary text-white font-bold py-3 px-6 rounded-full text-lg hover:bg-primary-dark transition shadow-lg disabled:opacity-50">
                        {saving ? <Loader2 className="animate-spin mr-2"/> : <Save size={20} className="mr-2"/>}
                        {saving ? 'Gemmer...' : 'Gem Ændringer'}
                    </button>
                </div>
                <style>{`
                    label { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; color: #4B5563; }
                    .dark label { color: #9CA3AF; }
                    .input-style { display: block; width: 100%; padding: 0.75rem 1rem; color: #212529; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.5rem; } 
                    .dark .input-style { background-color: #2a3343; border-color: #3c465b; color: #e2e8f0; }
                `}</style>
            </div>
        </div>
    );
};

export default OrganizationSettingsPage;