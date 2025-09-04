import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Organization } from '../../types';
import { uploadFile } from '../../services/s3Service';
import { Loader2, Plus, X } from 'lucide-react';

// This component can display a local blob URL directly.
const ImagePreview: React.FC<{ src: string; alt: string; className: string; onRemove: () => void; }> = ({ src, alt, className, onRemove }) => {
    return (
        <div className="relative group aspect-square">
            <img src={src} alt={alt} className={className} />
            <button type="button" onClick={onRemove} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"><X size={16}/></button>
        </div>
    );
};


const CreatePlacePage: React.FC = () => {
    const navigate = useNavigate();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('');
    const [offer, setOffer] = useState('');
    const [address, setAddress] = useState('');
    const [icon, setIcon] = useState('☕');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [phone, setPhone] = useState('');
    const [openingHours, setOpeningHours] = useState('');
    const [isSponsored, setIsSponsored] = useState(false);
    const [userCount, setUserCount] = useState('');
    
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

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
    
     // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
        }
    }, [imagePreviews]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setImageFiles(prev => [...prev, ...files]);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
    };

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        const urlToRevoke = imagePreviews[index];
        URL.revokeObjectURL(urlToRevoke);
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) {
            setError("Organization data not loaded. Cannot create place.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        
        // 1. Upload images
        const uploadedImageUrls: string[] = [];
        try {
            setIsUploading(true);
            for (const file of imageFiles) {
                const url = await uploadFile(file);
                uploadedImageUrls.push(url);
            }
        } catch(uploadError) {
             setError("Fejl ved upload af billeder. Prøv igen.");
             setIsSubmitting(false);
             setIsUploading(false);
             return;
        } finally {
            setIsUploading(false);
        }

        // 2. Insert place
        const { data: newPlace, error: insertError } = await supabase.from('places').insert({
            name, offer: isSponsored ? offer : '', address, icon, category, description, phone,
            opening_hours: openingHours,
            organization_id: organization.id,
            user_count: parseInt(userCount, 10) || 0,
            user_images: [],
            is_sponsored: isSponsored,
            image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
        }).select().single();

        if (insertError || !newPlace) {
            setError(insertError?.message || "Kunne ikke oprette mødested.");
            setIsSubmitting(false);
            return;
        }

        // 3. Insert images
        if (uploadedImageUrls.length > 0) {
            const imageRecords = uploadedImageUrls.map(url => ({
                place_id: newPlace.id,
                image_url: url,
            }));
            const { error: imageInsertError } = await supabase.from('place_images').insert(imageRecords);
            if (imageInsertError) {
                setError(`Mødested oprettet, men billeder kunne ikke gemmes: ${imageInsertError.message}`);
            }
        }

        navigate('/dashboard');
    };

    const emojiOptions = ['☕', '🍻', '🍔', '🌳', '🎨', '💪', '🛍️', '✨', '🛋️'];
    const categoryOptions = ['Café', 'Bar', 'Restaurant', 'Park', 'Kultur', 'Sport', 'Shopping', 'Gratis', 'Hygge'];

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
                        <div className="text-5xl p-2 bg-gray-100 dark:bg-dark-surface-light rounded-lg">{icon}</div>
                        <div className="grid grid-cols-5 sm:grid-cols-9 gap-2 flex-1">
                            {emojiOptions.map(e => (
                                <button key={e} type="button" onClick={() => setIcon(e)} className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${icon === e ? 'bg-primary-light dark:bg-primary/20 scale-110' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-light'}`}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn på sted</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                    </div>
                     <div>
                       <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Kategori</label>
                        <select id="category" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required>
                           <option value="" disabled>Vælg en kategori</option>
                           {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Billeder af Mødested</label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                         {imagePreviews.map((preview, index) => (
                            <ImagePreview key={index} src={preview} alt={`preview ${index}`} className="w-full h-full object-cover rounded-lg" onRemove={() => removeImage(index)} />
                        ))}
                        {imageFiles.length < 6 && (
                            <div onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                                <Plus size={32} className="text-gray-400"/>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" multiple />
                </div>

                <div className="bg-gray-50 dark:bg-dark-surface-light p-4 rounded-lg">
                     <label className="block text-sm font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Sponsorering</label>
                     <div className="flex items-center justify-between">
                         <p className="text-sm text-gray-600 dark:text-dark-text-secondary flex-1 mr-4">Er det sponsoreret?</p>
                         <div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" id="toggle-sponsored" checked={isSponsored} onChange={() => setIsSponsored(!isSponsored)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                            <label htmlFor="toggle-sponsored" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                     </div>
                     {isSponsored && (
                        <div className="mt-4">
                            <label htmlFor="offer" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Tilbud / Rabat</label>
                            <input type="text" id="offer" value={offer} onChange={e => setOffer(e.target.value)}
                                placeholder="F.eks. '2 gratis kaffe'"
                                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                        </div>
                     )}
                </div>

                 <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Adresse</label>
                    <input type="text" id="address" value={address} onChange={e => setAddress(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Beskrivelse</label>
                    <textarea id="description" rows={3} value={description} onChange={e => setDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Fortæl lidt om stedet..." required
                    ></textarea>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Telefon</label>
                       <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                     <div>
                       <label htmlFor="openingHours" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Åbningstider</label>
                        <input type="text" id="openingHours" value={openingHours} onChange={e => setOpeningHours(e.target.value)}
                         placeholder="F.eks. Man-Fre: 10:00 - 18:00"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                 </div>

                 <div>
                    <label htmlFor="userCount" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Hvor mange der befinder sig der i gennemsnit</label>
                    <input type="number" id="userCount" value={userCount} onChange={e => setUserCount(e.target.value)}
                        placeholder="F.eks. 15"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                
                <div className="pt-2">
                     <button
                        type="submit"
                        disabled={isSubmitting || isUploading}
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