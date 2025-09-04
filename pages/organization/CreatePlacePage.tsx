import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Organization } from '../../types';
import { uploadFile, fetchPrivateFile, uploadBase64File } from '../../services/s3Service';
import { generatePlaceImageFromText } from '../../services/geminiService';
import { Loader2, Plus, X, Sparkles } from 'lucide-react';
import { usePersistentState } from '../../hooks/useNotifications';
import CategorySelector from '../../components/CategorySelector';

const SmartImage: React.FC<{ src: string; alt: string; className: string; onRemove: () => void; }> = ({ src, alt, className, onRemove }) => {
    const [displayUrl, setDisplayUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let objectUrlToRevoke: string | null = null;
        let isMounted = true;
        
        const processUrl = async () => {
            if (!src) { if (isMounted) setIsLoading(false); return; }
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
    name: '',
    offer: '',
    address: '',
    icon: '☕',
    category_id: null as number | null,
    description: '',
    phone: '',
    openingHours: '',
    isSponsored: false,
    userCount: '',
    images: [] as string[],
};

const CreatePlacePage: React.FC = () => {
    const navigate = useNavigate();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = usePersistentState('createPlaceForm', initialFormState);
    
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

    const handleGenerateImages = async () => {
        if (!formData.name || !formData.description) {
            setError("Udfyld venligst navn og beskrivelse for at generere billeder.");
            return;
        }
        if (formData.images.length + aiNumberOfImages > 6) {
             setError(`Du kan højst have 6 billeder.`);
             return;
        }
        setIsGenerating(true);
        setError(null);
        try {
            const base64Images = await generatePlaceImageFromText(formData.description, formData.name, aiImageStyle, aiNumberOfImages);
            const uploadPromises = base64Images.map(base64 => uploadBase64File(base64, formData.name));
            const newUrls = await Promise.all(uploadPromises);
            setFormData(p => ({...p, images: [...p.images, ...newUrls]}));
        } catch (err: any) {
            setError(`Fejl ved billedgenerering: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
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


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) {
            setError("Organization data not loaded. Cannot create place.");
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

        const { data: newPlace, error: insertError } = await supabase.from('places').insert({
            name: formData.name, 
            offer: formData.isSponsored ? formData.offer : '', 
            address: formData.address, 
            icon: formData.icon, 
            category_id: formData.category_id, 
            description: formData.description, 
            phone: formData.phone,
            opening_hours: formData.openingHours,
            organization_id: organization.id,
            user_count: parseInt(formData.userCount, 10) || 0,
            user_images: [],
            is_sponsored: formData.isSponsored,
            image_url: formData.images.length > 0 ? formData.images[0] : null,
        }).select().single();

        if (insertError || !newPlace) {
            setError(insertError?.message || "Kunne ikke oprette mødested.");
            setIsSubmitting(false);
            return;
        }

        if (formData.images.length > 0) {
            const imageRecords = formData.images.map(url => ({ place_id: newPlace.id, image_url: url }));
            await supabase.from('place_images').insert(imageRecords);
        }
        
        setFormData(initialFormState); // Clear form and sessionStorage on submit
        navigate('/dashboard');
    };

    const emojiOptions = ['☕', '🍻', '🍔', '🌳', '🎨', '💪', '🛍️', '✨', '🛋️'];

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>
    }

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Opret et nyt Mødested</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Tilføj et nyt sted, hvor SoulMatch-brugere kan mødes og få rabat.</p>
            <style>{`.toggle-checkbox:checked { right: 0; border-color: #006B76; } .toggle-checkbox:checked + .toggle-label { background-color: #006B76; }`}</style>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                 {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
                
                <div>
                    <label className="block text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Vælg et ikon (emoji)</label>
                    <div className="flex items-center space-x-4">
                        <div className="text-5xl p-2 bg-gray-100 dark:bg-dark-surface-light rounded-lg">{formData.icon}</div>
                        <div className="grid grid-cols-5 sm:grid-cols-9 gap-2 flex-1">
                            {emojiOptions.map(e => (
                                <button key={e} type="button" onClick={() => setFormData(p => ({...p, icon: e}))} className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${formData.icon === e ? 'bg-primary-light dark:bg-primary/20 scale-110' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-light'}`}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn på sted</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleFormChange}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                    </div>
                </div>
                
                 <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Beskrivelse</label>
                    <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Fortæl lidt om stedet..." required
                    ></textarea>
                </div>
                
                <CategorySelector 
                    value={formData.category_id}
                    onChange={(id) => setFormData(p => ({...p, category_id: id}))}
                    type="place"
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Billeder af Mødested (op til 6)</label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                         {formData.images.map((img, index) => (
                            <SmartImage key={img} src={img} alt={`preview ${index}`} className="w-full h-full object-cover rounded-lg" onRemove={() => removeImage(img)} />
                        ))}
                        {formData.images.length < 6 && (
                            <div onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
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


                <div className="bg-gray-50 dark:bg-dark-surface-light p-4 rounded-lg">
                     <label className="block text-sm font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Sponsorering</label>
                     <div className="flex items-center justify-between">
                         <p className="text-sm text-gray-600 dark:text-dark-text-secondary flex-1 mr-4">Er det sponsoreret?</p>
                         <div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" id="toggle-sponsored" name="isSponsored" checked={formData.isSponsored} onChange={handleFormChange} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                            <label htmlFor="toggle-sponsored" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                     </div>
                     {formData.isSponsored && (
                        <div className="mt-4">
                            <label htmlFor="offer" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Tilbud / Rabat</label>
                            <input type="text" id="offer" name="offer" value={formData.offer} onChange={handleFormChange}
                                placeholder="F.eks. '2 gratis kaffe'"
                                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                        </div>
                     )}
                </div>

                 <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Adresse</label>
                    <input type="text" id="address" name="address" value={formData.address} onChange={handleFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Telefon</label>
                       <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                     <div>
                       <label htmlFor="openingHours" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Åbningstider</label>
                        <input type="text" id="openingHours" name="openingHours" value={formData.openingHours} onChange={handleFormChange}
                         placeholder="F.eks. Man-Fre: 10:00 - 18:00"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                 </div>

                 <div>
                    <label htmlFor="userCount" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Hvor mange der befinder sig der i gennemsnit</label>
                    <input type="number" id="userCount" name="userCount" value={formData.userCount} onChange={handleFormChange}
                        placeholder="F.eks. 15"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                
                <div className="pt-2">
                     <button
                        type="submit"
                        disabled={isSubmitting || isUploading || isGenerating}
                        className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50"
                    >
                        {isSubmitting ? 'Opretter...' : 'Opret Mødested'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreatePlacePage;