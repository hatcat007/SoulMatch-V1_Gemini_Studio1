
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Info, X, Calendar, Tag, MapPin, Smile, Image as ImageIcon, Loader2, UploadCloud, Plus, Sparkles, Ticket } from 'lucide-react';
import { uploadFile, fetchPrivateFile } from '../../services/s3Service';
import { generateEventImageFromText } from '../../services/geminiService';
import type { Organization } from '../../types';
import { usePersistentState } from '../../hooks/useNotifications';
import CategorySelector from '../../components/CategorySelector';
import LoadingScreen from '../../components/LoadingScreen';

const SmartImage: React.FC<{ src: string; alt: string; className: string; onRemove: () => void; }> = ({ src, alt, className, onRemove }) => {
    const [displayUrl, setDisplayUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let objectUrlToRevoke: string | null = null;
        let isMounted = true;
        
        const processUrl = async () => {
            if (!src) { if (isMounted) setIsLoading(false); return; }
            setIsLoading(true);

            if (src.startsWith('blob:') || src.startsWith('http') || src.startsWith('data:')) {
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
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
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
    emoji: '🎉',
    title: '',
    description: '',
    time: '',
    end_time: '',
    is_sponsored: false,
    offer: '',
    category_id: null as number | null,
    color: 'bg-blue-100',
    address: '',
    images: [] as string[],
};

const CreateOrgEventPage: React.FC = () => {
    const navigate = useNavigate();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = usePersistentState('createOrgEventForm', initialFormState);
    
    // AI State
    const [aiImageStyle, setAiImageStyle] = useState<'realistic' | 'illustration'>('realistic');
    const [aiNumberOfImages, setAiNumberOfImages] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrg = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: orgData } = await supabase.from('organizations').select('*').eq('auth_id', user.id).single();
                setOrganization(orgData);
            }
            setLoading(false);
        };
        fetchOrg();
    }, []);
    
    useEffect(() => {
        const currentlyUploading = formData.images.some(img => img.startsWith('blob:'));
        setIsUploading(currentlyUploading);
    }, [formData.images]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files).slice(0, 6 - formData.images.length);
        if (files.length === 0) return;

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setFormData(p => ({ ...p, images: [...p.images, ...newPreviews]}));

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
    
    const handleGenerateImages = async () => {
        if (!formData.title || !formData.description) {
            setError("Udfyld venligst titel og beskrivelse for at generere billeder.");
            return;
        }
        if (formData.images.length + aiNumberOfImages > 6) {
             setError(`Du kan højst have 6 billeder.`);
             return;
        }
        setIsGenerating(true);
        setError(null);
        try {
            const base64Images = await generateEventImageFromText(formData.description, aiImageStyle, formData.title, true, aiNumberOfImages);
            const dataUrls = base64Images.map(base64 => `data:image/jpeg;base64,${base64}`);
            setFormData(p => ({...p, images: [...p.images, ...dataUrls]}));
        } catch (err: any) {
            setError(`Fejl ved billedgenerering: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) {
            setError("Organization data not loaded. Cannot create event.");
            return;
        }
        if (isUploading) {
            setError("Vent venligst til alle billeder er færdiguploadet.");
            return;
        }
        if (!formData.category_id) {
            setError("Vælg venligst en kategori.");
            return;
        }
        setIsSubmitting(true);
        setError(null);

        const { data: newEvent, error: insertError } = await supabase.from('events').insert({
            title: formData.title, 
            description: formData.description, 
            time: formData.time, 
            end_time: formData.end_time || null,
            is_sponsored: formData.is_sponsored,
            offer: formData.is_sponsored ? formData.offer : '',
            category_id: formData.category_id, 
            address: formData.address,
            image_url: formData.images.length > 0 ? formData.images[0] : null,
            icon: formData.emoji, 
            color: formData.color,
            organization_id: organization.id,
            host_name: organization.name,
            host_avatar_url: organization.logo_url,
        }).select().single();

        if (insertError || !newEvent) {
            setError(insertError?.message || "Kunne ikke oprette event.");
            setIsSubmitting(false);
            return;
        }
        
        if (formData.images.length > 0) {
            const imageRecords = formData.images.map(url => ({ event_id: newEvent.id, image_url: url }));
            await supabase.from('event_images').insert(imageRecords);
        }
        
        setFormData(initialFormState); // Clear form and sessionStorage on submit
        navigate('/dashboard');
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({...prev, [name]: checked}));
        } else {
            setFormData(prev => ({...prev, [name]: value}));
        }
    };

    const emojiOptions = ['🎉', '🍔', '🎨', '🎲', '🎬', '🚶‍♀️', '🎮', '💪', '🥳', '☕', '🎸', '🍽️'];
    const colorOptions = ['bg-blue-100', 'bg-red-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100'];

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Opret et nyt Event</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Udfyld detaljerne for at tilføje et nyt socialt event til SoulMatch.</p>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                 <style>{`.toggle-checkbox:checked { right: 0; border-color: #006B76; } .toggle-checkbox:checked + .toggle-label { background-color: #006B76; }`}</style>
                 {error && <p className="text-red-500 text-center bg-red-100 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm">{error}</p>}
                
                <div>
                    <label className="block text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Vælg et ikon (emoji)</label>
                    <div className="flex items-center space-x-4">
                        <div className="text-5xl p-2 bg-gray-100 dark:bg-dark-surface-light rounded-lg">{formData.emoji}</div>
                        <div className="grid grid-cols-6 gap-2 flex-1">
                            {emojiOptions.map(e => (
                                <button key={e} type="button" onClick={() => setFormData(p=>({...p, emoji: e}))} className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${formData.emoji === e ? 'bg-primary-light dark:bg-primary/20 scale-110' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-light'}`}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn på event</label>
                    <input
                        type="text" id="title" name="title" value={formData.title} onChange={handleFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="F.eks. Hyggelig Brætspilsaften" required
                    />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Beskrivelse</label>
                    <textarea
                        id="description" name="description" rows={4} value={formData.description} onChange={handleFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Fortæl lidt om hvad I skal lave..." required
                    ></textarea>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Event Billeder (op til 6)</label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                         {formData.images.map((img, index) => (
                            <SmartImage key={img} src={img} alt={`preview ${index}`} className="w-full h-full object-cover rounded-lg" onRemove={() => removeImage(img)} />
                        ))}
                        {formData.images.length < 6 && (
                            <div onClick={() => !isUploading && imageInputRef.current?.click()} className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                                <Plus size={32} className="text-gray-400"/>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" multiple />
                </div>

                <div className="p-4 bg-primary-light/50 dark:bg-dark-surface-light rounded-lg space-y-3">
                    <h3 className="font-bold text-primary dark:text-dark-text-primary">Generer billeder med AI</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setAiImageStyle('realistic')} className={`p-2 rounded-md text-sm font-semibold border-2 ${aiImageStyle === 'realistic' ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-dark-border'}`}>Realistisk</button>
                        <button type="button" onClick={() => setAiImageStyle('illustration')} className={`p-2 rounded-md text-sm font-semibold border-2 ${aiImageStyle === 'illustration' ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-dark-border'}`}>Illustration</button>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Antal</label>
                         <div className="flex justify-between items-center bg-white dark:bg-dark-surface p-1 rounded-lg">
                            {[1, 2, 3, 4].map(num => (
                                <button key={num} type="button" onClick={() => setAiNumberOfImages(num)} className={`w-full py-1 rounded-md font-bold text-sm transition ${aiNumberOfImages === num ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-dark-border'}`}>{num}</button>
                            ))}
                        </div>
                    </div>
                    <button type="button" onClick={handleGenerateImages} disabled={isGenerating || isUploading} className="w-full bg-primary text-white font-bold py-2 px-4 rounded-full text-sm hover:bg-primary-dark transition duration-300 flex items-center justify-center disabled:opacity-60">
                         {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" size={16}/>}
                         {isGenerating ? 'Genererer...' : `Generer ${aiNumberOfImages} Billede(r)`}
                    </button>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Start tidspunkt</label>
                       <input type="datetime-local" id="time" name="time" value={formData.time} onChange={handleFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/>
                    </div>
                    <div>
                       <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Slut tidspunkt (valgfrit)</label>
                       <input type="datetime-local" id="end_time" name="end_time" value={formData.end_time} onChange={handleFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                     <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Adresse</label>
                        <input
                            type="text" id="address" name="address" value={formData.address} onChange={handleFormChange}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="F.eks. Gade 123, 9000 Aalborg" required
                        />
                    </div>
                 </div>

                <CategorySelector 
                    value={formData.category_id}
                    onChange={(id) => setFormData(p => ({...p, category_id: id}))}
                    type="event"
                />

                <div className="bg-gray-50 dark:bg-dark-surface-light p-4 rounded-lg">
                     <label className="block text-sm font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Sponsorering</label>
                     <div className="flex items-center justify-between">
                         <p className="text-sm text-gray-600 dark:text-dark-text-secondary flex-1 mr-4">Er dette event sponsoreret med et tilbud?</p>
                         <div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" id="toggle-sponsored" name="is_sponsored" checked={formData.is_sponsored} onChange={handleFormChange} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                            <label htmlFor="toggle-sponsored" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                     </div>
                     {formData.is_sponsored && (
                        <div className="mt-4">
                            <label htmlFor="offer" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Tilbud / Rabat</label>
                            <input type="text" id="offer" name="offer" value={formData.offer} onChange={handleFormChange}
                                placeholder="F.eks. 'Gratis kaffe'"
                                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                        </div>
                     )}
                </div>


                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Kort farve</label>
                     <div className="flex space-x-2">
                        {colorOptions.map(c => (
                            <button key={c} type="button" onClick={() => setFormData(p => ({...p, color: c}))} className={`w-10 h-10 rounded-full ${c} border-2 ${formData.color === c ? 'border-primary' : 'border-transparent'}`}></button>
                        ))}
                    </div>
                </div>
                
                <div>
                     <button
                        type="submit"
                        disabled={isSubmitting || isUploading || isGenerating}
                        className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50"
                    >
                        {isSubmitting ? 'Opretter...' : 'Opret Event'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateOrgEventPage;
