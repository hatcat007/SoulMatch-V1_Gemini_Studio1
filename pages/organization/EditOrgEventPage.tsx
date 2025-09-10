import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Event, ImageRecord, Activity, Interest, InterestCategory } from '../../types';
import { uploadFile, fetchPrivateFile } from '../../services/s3Service';
import { Loader2, Plus, X, Ticket, Smile } from 'lucide-react';
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
            if (!src) { if (isMounted) { setIsLoading(false); setDisplayUrl(''); } return; }
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
        return () => { isMounted = false; if (objectUrlToRevoke) { URL.revokeObjectURL(objectUrlToRevoke); } };
    }, [src]);

    if (isLoading) {
        return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light rounded-lg flex items-center justify-center`}><Loader2 className="animate-spin text-gray-400" size={24} /></div>;
    }
    
    if (!displayUrl) return null;

    return (
        <div className="relative group aspect-square">
            <img src={displayUrl} alt={alt} className={className} />
            <button type="button" onClick={onRemove} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"><X size={16}/></button>
        </div>
    );
};

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const formatText = (inputText: string) => {
        if (!inputText) return '';
        let formatted = inputText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/^\s*[-*]\s+(.*)/gm, '<li class="ml-4 list-disc">$1</li>');
        formatted = formatted.replace(/(<li.*?>.*?<\/li>)+/gs, '<ul>$&</ul>');
        formatted = formatted.replace(/<\/ul>\n/g, '</ul><br/>').replace(/\n/g, '<br />');
        return formatted;
    };
    return <div dangerouslySetInnerHTML={{ __html: formatText(text) }} className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap leading-relaxed" />;
};


const EditOrgEventPage: React.FC = () => {
    const navigate = useNavigate();
    const { eventId } = useParams<{ eventId: string }>();

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '', description: '', time: '', end_time: '', is_sponsored: false, offer: '', category_id: null as number | null, address: '', icon: '🎉', color: 'bg-blue-100', is_diagnosis_friendly: false,
    });
    const [images, setImages] = useState<ImageRecord[]>([]);
    
    const [allActivities, setAllActivities] = useState<Activity[]>([]);
    const [selectedActivityIds, setSelectedActivityIds] = useState<number[]>([]);

    const [allInterests, setAllInterests] = useState<Interest[]>([]);
    const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
    const [selectedInterestIds, setSelectedInterestIds] = useState<number[]>([]);
    
    const [isEditingDescription, setIsEditingDescription] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!eventId) { setError("Event ID mangler."); setLoading(false); return; }

            const { data, error: fetchError } = await supabase.from('events').select('*, images:event_images(*)').eq('id', eventId).single();

            if (fetchError) {
                setError(`Kunne ikke hente event: ${fetchError.message}`);
            } else if (data) {
                setFormData({
                    title: data.title || '',
                    description: data.description || '',
                    time: data.time ? new Date(data.time).toISOString().slice(0, 16) : '',
                    end_time: data.end_time ? new Date(data.end_time).toISOString().slice(0, 16) : '',
                    is_sponsored: data.is_sponsored || false,
                    offer: data.offer || '',
                    category_id: data.category_id,
                    address: data.address || '',
                    icon: data.icon || '🎉',
                    color: data.color || 'bg-blue-100',
                    is_diagnosis_friendly: data.is_diagnosis_friendly || false,
                });
                setImages(data.images || []);
            }
            
            const { data: activitiesData } = await supabase.from('activities').select('*').eq('approved', true).order('name');
            if (activitiesData) setAllActivities(activitiesData);
            
            const { data: activityLinks } = await supabase.from('event_activities').select('activity_id').eq('event_id', eventId);
            if (activityLinks) setSelectedActivityIds(activityLinks.map(link => link.activity_id));
            
            const { data: iCatData } = await supabase.from('interest_categories').select('*').order('name');
            const { data: iData } = await supabase.from('interests').select('*').eq('approved', true).order('name');
            if (iCatData) setInterestCategories(iCatData);
            if (iData) setAllInterests(iData);

            const { data: interestLinks } = await supabase.from('event_interests').select('interest_id').eq('event_id', eventId);
            if(interestLinks) setSelectedInterestIds(interestLinks.map(link => link.interest_id));

            setLoading(false);
        };
        fetchEvent();
    }, [eventId]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const file = e.target.files[0];
        if (!file) return;

        setError(null);
        try {
            const url = await uploadFile(file);
            setImages(prev => [...prev, { id: Date.now(), image_url: url }]);
        } catch (uploadError) {
            setError('Billedupload fejlede.');
        }
    };
    
    const removeImage = (idToRemove: number) => {
        setImages(prev => prev.filter(img => img.id !== idToRemove));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleActivityToggle = (activity: Activity) => {
        const newSelectedIds = selectedActivityIds.includes(activity.id)
            ? selectedActivityIds.filter(id => id !== activity.id)
            : [...selectedActivityIds, activity.id];
        setSelectedActivityIds(newSelectedIds);
    };
    
    const handleInterestToggle = (interest: Interest) => {
        const newSelectedIds = selectedInterestIds.includes(interest.id)
            ? selectedInterestIds.filter(id => id !== interest.id)
            : [...selectedInterestIds, interest.id];
        setSelectedInterestIds(newSelectedIds);
    };
    
    const selectedActivities = useMemo(() => allActivities.filter(a => selectedActivityIds.includes(a.id)), [allActivities, selectedActivityIds]);
    const allActivitiesForSelector = useMemo(() => allActivities.map(a => ({ ...a, category_id: 0 })), [allActivities]);
    const selectedActivitiesForSelector = useMemo(() => selectedActivities.map(a => ({ ...a, category_id: 0 })), [selectedActivities]);

    const selectedInterests = useMemo(() => allInterests.filter(i => selectedInterestIds.includes(i.id)), [allInterests, selectedInterestIds]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.category_id) {
            setError("Vælg venligst en kategori.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        
        const { error: updateError } = await supabase
            .from('events')
            .update({
                title: formData.title, description: formData.description,
                time: formData.time ? new Date(formData.time).toISOString() : null,
                end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
                is_sponsored: formData.is_sponsored, offer: formData.is_sponsored ? formData.offer : '',
                category_id: formData.category_id, address: formData.address,
                icon: formData.icon, color: formData.color,
                image_url: images.length > 0 ? images[0].image_url : null,
                is_diagnosis_friendly: formData.is_diagnosis_friendly,
            }).eq('id', eventId);

        if (updateError) { setError(updateError.message); setIsSubmitting(false); return; }

        await supabase.from('event_images').delete().eq('event_id', eventId);
        if (images.length > 0) {
            const imageRecords = images.map(({ image_url }) => ({ event_id: Number(eventId), image_url: image_url }));
            await supabase.from('event_images').insert(imageRecords);
        }

        const { error: activityError } = await supabase.rpc('add_activities_to_event', { p_event_id: Number(eventId), p_activity_ids: selectedActivityIds });
        if (activityError) { setError(`Event opdateret, men aktiviteter kunne ikke gemmes: ${activityError.message}`); setIsSubmitting(false); return; }

        const { error: interestError } = await supabase.rpc('add_interests_to_event', { p_event_id: Number(eventId), p_interest_ids: selectedInterestIds });
        if (interestError) { setError(`Event opdateret, men interesser kunne ikke gemmes: ${interestError.message}`); setIsSubmitting(false); return; }

        navigate('/dashboard');
    };

    const emojiOptions = ['🎉', '🍔', '🎨', '🎲', '🎬', '🚶‍♀️', '🎮', '💪', '🥳', '☕', '🎸', '🍽️'];
    const colorOptions = ['bg-blue-100', 'bg-red-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100'];

    if (loading) return <LoadingScreen message="Indlæser event..." />
    if (error && !formData.title) return <div className="p-8 text-center text-red-500">{error}</div>

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Rediger Event</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Opdater detaljerne for dit event.</p>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                 <style>{`.toggle-checkbox:checked { right: 0; border-color: #006B76; } .toggle-checkbox:checked + .toggle-label { background-color: #006B76; }`}</style>
                 {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
                
                <div className="space-y-2">
                    <label className="block text-lg font-semibold text-gray-800 dark:text-dark-text-primary">Ikon (emoji)</label>
                    <div className="flex items-center space-x-4"><div className="text-5xl p-2 bg-gray-100 dark:bg-dark-surface-light rounded-lg">{formData.icon}</div><div className="grid grid-cols-6 gap-2 flex-1">{emojiOptions.map(e => (<button key={e} type="button" onClick={() => setFormData(p => ({...p, icon: e}))} className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${formData.icon === e ? 'bg-primary-light dark:bg-primary/20 scale-110' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-light'}`}>{e}</button>))}</div></div>
                </div>
                
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn på event</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Event Billeder</label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {images.map(image => (<SmartImage key={image.id} src={image.image_url} alt="Event billede" className="w-full h-full object-cover rounded-lg" onRemove={() => removeImage(image.id)} />))}
                        {images.length < 6 && (<div onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100"><Plus size={32} className="text-gray-400"/></div>)}
                    </div>
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1"><label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Beskrivelse</label><button type="button" onClick={() => setIsEditingDescription(!isEditingDescription)} className="text-xs font-semibold text-primary hover:underline">{isEditingDescription ? 'Vis formatering' : 'Rediger'}</button></div>
                    {isEditingDescription ? (<textarea id="description" name="description" rows={4} value={formData.description} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required></textarea>) : (<div className="w-full p-3 min-h-[120px] bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg"><MarkdownRenderer text={formData.description} /></div>)}
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Start tidspunkt</label><input type="datetime-local" id="time" name="time" value={formData.time} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/></div>
                    <div><label htmlFor="end_time" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Slut tidspunkt</label><input type="datetime-local" id="end_time" name="end_time" value={formData.end_time} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"/></div>
                    <div><label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Adresse</label><input type="text" id="address" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required /></div>
                 </div>

                 <CategorySelector value={formData.category_id} onChange={(id) => setFormData(p => ({...p, category_id: id}))} type="event" />
                
                 <TagSelector 
                    title="Vælg aktiviteter" 
                    categories={[]} 
                    allTags={allActivitiesForSelector} 
                    selectedTags={selectedActivitiesForSelector} 
                    onToggleTag={(tag) => {
                        // FIX: Find the original activity object from the allActivities list
                        // to prevent type casting issues, as TagSelector expects Interest or PersonalityTag.
                        const activity = allActivities.find(a => a.id === tag.id);
                        if (activity) {
                            handleActivityToggle(activity);
                        }
                    }} 
                    containerHeight="h-auto"
                />
                 <TagSelector title="Vælg interesser" categories={interestCategories} allTags={allInterests} selectedTags={selectedInterests} onToggleTag={(tag) => handleInterestToggle(tag as Interest)} containerHeight="h-auto" />

                <div className="bg-gray-50 dark:bg-dark-surface-light p-4 rounded-lg">
                     <div className="flex items-center justify-between"><label htmlFor="toggle-sponsored" className="text-sm font-semibold text-gray-800 dark:text-dark-text-primary">Sponsoreret?</label><div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle"><input type="checkbox" id="toggle-sponsored" name="is_sponsored" checked={formData.is_sponsored} onChange={handleInputChange} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/><label htmlFor="toggle-sponsored" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label></div></div>
                     {formData.is_sponsored && (<div className="mt-4"><label htmlFor="offer" className="block text-sm font-medium mb-1">Tilbud</label><input type="text" id="offer" name="offer" value={formData.offer} onChange={handleInputChange} className="w-full px-4 py-3 bg-white dark:bg-dark-surface border rounded-lg" required /></div>)}
                </div>

                 <div className="bg-gray-50 dark:bg-dark-surface-light p-4 rounded-lg">
                    <div className="flex items-center justify-between"><label htmlFor="toggle-diagnosis" className="text-sm font-semibold text-gray-800 dark:text-dark-text-primary">Diagnosevenligt?</label><div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle"><input type="checkbox" id="toggle-diagnosis" name="is_diagnosis_friendly" checked={formData.is_diagnosis_friendly} onChange={handleInputChange} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/><label htmlFor="toggle-diagnosis" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label></div></div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Kort farve</label>
                     <div className="flex space-x-2">{colorOptions.map(c => (<button key={c} type="button" onClick={() => setFormData(p => ({...p, color: c}))} className={`w-10 h-10 rounded-full ${c} border-2 ${formData.color === c ? 'border-primary' : 'border-transparent'}`}></button>))}</div>
                </div>
                
                <div>
                     <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50">
                        {isSubmitting ? 'Gemmer...' : 'Gem Ændringer'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditOrgEventPage;