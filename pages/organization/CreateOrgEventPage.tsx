import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Organization, Activity, Interest, InterestCategory } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { usePersistentState } from '../../hooks/useNotifications';
import { uploadFile, fetchPrivateFile } from '../../services/s3Service';
import { Loader2, Plus, X, Image as ImageIcon, Ticket, Smile } from 'lucide-react';
import CategorySelector from '../../components/CategorySelector';
import LoadingScreen from '../../components/LoadingScreen';
import TagSelector from '../../components/TagSelector';

// This component can display a local blob URL directly or fetch a private S3 URL.
const SmartImage: React.FC<{ src: string; alt: string; className: string; onRemove: () => void; }> = ({ src, alt, className, onRemove }) => {
    const [displayUrl, setDisplayUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let objectUrlToRevoke: string | null = null;
        let isMounted = true;
        
        const processUrl = async () => {
            if (!src) { if (isMounted) setIsLoading(false); return; }
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

    const isUploading = src.startsWith('blob:');

    if (isLoading && !isUploading) {
        return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light rounded-lg flex items-center justify-center`}><Loader2 className="animate-spin text-gray-400" size={24} /></div>;
    }

    return (
        <div className="relative group aspect-square">
            <img src={isUploading ? src : displayUrl} alt={alt} className={className} />
            {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg">
                    <Loader2 className="animate-spin text-white" size={24} />
                </div>
            )}
            <button type="button" onClick={onRemove} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"><X size={16}/></button>
        </div>
    );
};


const initialFormState = {
    title: '',
    description: '',
    time: '',
    end_time: '',
    address: '',
    icon: '🎉',
    color: 'bg-blue-100',
    category_id: null as number | null,
    is_sponsored: false,
    offer: '',
    images: [] as string[],
    selectedActivityIds: [] as number[],
    selectedInterestIds: [] as number[],
    is_diagnosis_friendly: false,
};

const CreateOrgEventPage: React.FC = () => {
    const navigate = useNavigate();
    const { organization, loading: authLoading } = useAuth();
    const [formData, setFormData] = usePersistentState('createOrgEventForm', initialFormState);

    const [isUploading, setIsUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Activities State
    const [allActivities, setAllActivities] = useState<Activity[]>([]);

    // Interests State
    const [allInterests, setAllInterests] = useState<Interest[]>([]);
    const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);

    useEffect(() => {
        const currentlyUploading = formData.images.some(img => img.startsWith('blob:'));
        setIsUploading(currentlyUploading);
    }, [formData.images]);
    
    useEffect(() => {
        const fetchTagData = async () => {
            const { data: actData } = await supabase.from('activities').select('*').eq('approved', true).order('name');
            if (actData) setAllActivities(actData);
            
            const { data: iCatData } = await supabase.from('interest_categories').select('*').order('name');
            const { data: iData } = await supabase.from('interests').select('*').eq('approved', true).order('name');
            if (iCatData) setInterestCategories(iCatData);
            if (iData) setAllInterests(iData);
        };
        fetchTagData();
    }, []);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({...prev, [name]: checked}));
        } else {
            setFormData(prev => ({...prev, [name]: value}));
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files).slice(0, 6 - formData.images.length);
        if (files.length === 0) return;

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setFormData(p => ({...p, images: [...p.images, ...newPreviews]}));

        files.forEach((file, index) => {
            uploadFile(file)
                .then(finalUrl => {
                    setFormData(current => ({...current, images: current.images.map(img => (img === newPreviews[index] ? finalUrl : img))}));
                    URL.revokeObjectURL(newPreviews[index]);
                })
                .catch(err => {
                    setError(`Upload fejlede for ${file.name}.`);
                    setFormData(current => ({...current, images: current.images.filter(img => img !== newPreviews[index])}));
                    URL.revokeObjectURL(newPreviews[index]);
                });
        });
    };

    const removeImage = (imageToRemove: string) => {
        setFormData(p => ({...p, images: p.images.filter(img => img !== imageToRemove)}));
        if (imageToRemove.startsWith('blob:')) {
            URL.revokeObjectURL(imageToRemove);
        }
    };
    
    const handleActivityToggle = (activity: Activity) => {
        const newIds = formData.selectedActivityIds.includes(activity.id)
            ? formData.selectedActivityIds.filter(id => id !== activity.id)
            : [...formData.selectedActivityIds, activity.id];
        setFormData(p => ({ ...p, selectedActivityIds: newIds }));
    };
    
    const handleInterestToggle = (interest: Interest) => {
        const newIds = formData.selectedInterestIds.includes(interest.id)
            ? formData.selectedInterestIds.filter(id => id !== interest.id)
            : [...formData.selectedInterestIds, interest.id];
        setFormData(p => ({ ...p, selectedInterestIds: newIds }));
    };
    
    const selectedActivities = useMemo(() => allActivities.filter(a => formData.selectedActivityIds.includes(a.id)), [allActivities, formData.selectedActivityIds]);
    const allActivitiesForSelector = useMemo(() => allActivities.map(a => ({ ...a, category_id: 0 })), [allActivities]);
    const selectedActivitiesForSelector = useMemo(() => selectedActivities.map(a => ({ ...a, category_id: 0 })), [selectedActivities]);

    const selectedInterests = useMemo(() => allInterests.filter(i => formData.selectedInterestIds.includes(i.id)), [allInterests, formData.selectedInterestIds]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) { setError("Organisationsdata ikke indlæst."); return; }
        if (isUploading) { setError("Vent venligst på at billeder er uploadet."); return; }
        if (!formData.category_id) { setError("Vælg venligst en kategori."); return; }
        setIsSubmitting(true); setError(null);

        try {
            const { data: newEvent, error: insertError } = await supabase.from('events').insert({
                title: formData.title, description: formData.description,
                time: new Date(formData.time).toISOString(), end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
                address: formData.address, icon: formData.icon, color: formData.color,
                category_id: formData.category_id, is_sponsored: formData.is_sponsored,
                offer: formData.is_sponsored ? formData.offer : '',
                organization_id: organization.id, host_name: organization.name, host_avatar_url: organization.logo_url,
                image_url: formData.images.length > 0 ? formData.images[0] : null,
                is_diagnosis_friendly: formData.is_diagnosis_friendly,
            }).select().single();

            if (insertError) throw insertError;
            if (!newEvent) throw new Error("Event-oprettelse returnerede ingen data.");

            if (formData.images.length > 0) {
                const imageRecords = formData.images.map(url => ({ event_id: newEvent.id, image_url: url }));
                await supabase.from('event_images').insert(imageRecords);
            }
            if (formData.selectedActivityIds.length > 0) {
                await supabase.rpc('add_activities_to_event', { p_event_id: newEvent.id, p_activity_ids: formData.selectedActivityIds });
            }
             if (formData.selectedInterestIds.length > 0) {
                await supabase.rpc('add_interests_to_event', { p_event_id: newEvent.id, p_interest_ids: formData.selectedInterestIds });
            }

            setFormData(initialFormState);
            navigate('/dashboard');
        } catch (err: any) {
            setError(`Fejl ved oprettelse af event: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const emojiOptions = ['🎉', '🍔', '🎨', '🎲', '🎬', '🚶‍♀️', '🎮', '💪', '🥳', '☕', '🎸', '🍽️'];
    const colorOptions = ['bg-blue-100', 'bg-red-100', 'bg-green-100', 'bg-yellow-100', 'bg-indigo-100', 'bg-pink-100', 'bg-teal-100'];

    if (authLoading) return <LoadingScreen />;

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Opret et nyt Event</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Udfyld detaljerne for dit event for at tiltrække deltagere.</p>
            <style>{`.toggle-checkbox:checked { right: 0; border-color: #006B76; } .toggle-checkbox:checked + .toggle-label { background-color: #006B76; }`}</style>
            
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                 {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn på event</label>
                        <input type="text" id="title" name="title" value={formData.title} onChange={handleFormChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg" required />
                    </div>
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Beskrivelse</label>
                    <textarea id="description" name="description" rows={4} value={formData.description} onChange={handleFormChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg" required></textarea>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Start tidspunkt</label>
                       <input type="datetime-local" id="time" name="time" value={formData.time} onChange={handleFormChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg" required/>
                    </div>
                     <div>
                       <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Slut tidspunkt (valgfrit)</label>
                       <input type="datetime-local" id="end_time" name="end_time" value={formData.end_time} onChange={handleFormChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg"/>
                    </div>
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Adresse</label>
                    <input type="text" id="address" name="address" value={formData.address} onChange={handleFormChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg" required />
                </div>
                
                <CategorySelector value={formData.category_id} onChange={(id) => setFormData(p => ({...p, category_id: id}))} type="event" />

                <TagSelector 
                    title="Vælg aktiviteter" 
                    categories={[]} 
                    allTags={allActivitiesForSelector} 
                    selectedTags={selectedActivitiesForSelector} 
                    onToggleTag={(tag) => {
                        const activity = allActivities.find(a => a.id === tag.id);
                        if (activity) {
                            handleActivityToggle(activity);
                        }
                    }} 
                    containerHeight="h-auto"
                />
                
                <TagSelector title="Vælg interesser" categories={interestCategories} allTags={allInterests} selectedTags={selectedInterests} onToggleTag={(tag) => handleInterestToggle(tag as Interest)} containerHeight="h-auto" />
                
                <div className="bg-gray-50 dark:bg-dark-surface-light p-4 rounded-lg">
                     <label className="block text-sm font-semibold text-gray-800 dark:text-dark-text-primary mb-3"><Ticket className="inline mr-2" size={16}/> Sponsorering</label>
                     <div className="flex items-center justify-between"><p className="text-sm text-gray-600 dark:text-dark-text-secondary flex-1 mr-4">Er dette event sponsoreret?</p><div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle"><input type="checkbox" id="toggle-sponsored" name="is_sponsored" checked={formData.is_sponsored} onChange={handleFormChange} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/><label htmlFor="toggle-sponsored" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label></div></div>
                     {formData.is_sponsored && (<div className="mt-4"><label htmlFor="offer" className="block text-sm font-medium mb-1">Tilbud</label><input type="text" id="offer" name="offer" value={formData.offer} onChange={handleFormChange} className="w-full px-4 py-3 bg-white dark:bg-dark-surface border rounded-lg" required /></div>)}
                </div>

                <div className="bg-gray-50 dark:bg-dark-surface-light p-4 rounded-lg">
                    <label className="block text-sm font-semibold text-gray-800 dark:text-dark-text-primary mb-3"><Smile className="inline mr-2" size={16}/> Diagnosevenligt</label>
                    <div className="flex items-center justify-between"><p className="text-sm text-gray-600 dark:text-dark-text-secondary flex-1 mr-4">Er dette event designet til at være hensynsfuldt over for deltagere med diagnoser?</p><div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle"><input type="checkbox" id="toggle-diagnosis" name="is_diagnosis_friendly" checked={formData.is_diagnosis_friendly} onChange={handleFormChange} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/><label htmlFor="toggle-diagnosis" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label></div></div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Billeder (op til 6)</label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                         {formData.images.map((img, index) => (<SmartImage key={img} src={img} alt={`preview ${index}`} className="w-full h-full object-cover rounded-lg" onRemove={() => removeImage(img)} />))}
                        {formData.images.length < 6 && (<div onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100"><Plus size={32} className="text-gray-400"/></div>)}
                    </div>
                    <input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" multiple />
                </div>
                
                <div className="pt-2"><button type="submit" disabled={isSubmitting || isUploading} className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition shadow-lg disabled:opacity-50">{isSubmitting ? 'Opretter...' : 'Opret Event'}</button></div>
            </form>
        </div>
    );
};

export default CreateOrgEventPage;