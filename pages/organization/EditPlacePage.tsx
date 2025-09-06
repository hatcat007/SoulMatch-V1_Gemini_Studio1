
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Place, ImageRecord } from '../../types';
import { uploadFile, fetchPrivateFile } from '../../services/s3Service';
import { Loader2, Plus, X } from 'lucide-react';
import CategorySelector from '../../components/CategorySelector';
import LoadingScreen from '../../components/LoadingScreen';

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

    if (isLoading) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light rounded-lg flex items-center justify-center`}><Loader2 className="animate-spin text-gray-400" size={24} /></div>;
    if (!displayUrl) return null;

    return (
        <div className="relative group aspect-square">
            <img src={displayUrl} alt={alt} className={className} />
            <button type="button" onClick={onRemove} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"><X size={16}/></button>
        </div>
    );
};

const EditPlacePage: React.FC = () => {
    const navigate = useNavigate();
    const { placeId } = useParams<{ placeId: string }>();

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '', offer: '', address: '', icon: '☕', category_id: null as number | null, description: '',
        phone: '', opening_hours: '', is_sponsored: false, user_count: '0'
    });
    const [images, setImages] = useState<ImageRecord[]>([]);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchPlace = async () => {
            if (!placeId) { setError("Mødested ID mangler."); setLoading(false); return; }

            const { data, error: fetchError } = await supabase.from('places').select('*, images:place_images(*)').eq('id', placeId).single();

            if (fetchError) {
                setError(`Kunne ikke hente mødested: ${fetchError.message}`);
            } else if (data) {
                setFormData({
                    name: data.name || '',
                    offer: data.offer || '',
                    address: data.address || '',
                    icon: data.icon || '☕',
                    category_id: data.category_id,
                    description: data.description || '',
                    phone: data.phone || '',
                    opening_hours: data.opening_hours || '',
                    is_sponsored: data.is_sponsored || false,
                    user_count: data.user_count?.toString() || '0'
                });
                setImages(data.images || []);
            }
            setLoading(false);
        };
        fetchPlace();
    }, [placeId]);

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
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.category_id) {
            setError("Vælg venligst en kategori.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        
        const { error: updateError } = await supabase
            .from('places')
            .update({
                name: formData.name,
                offer: formData.is_sponsored ? formData.offer : '',
                address: formData.address,
                icon: formData.icon,
                category_id: formData.category_id,
                description: formData.description,
                phone: formData.phone,
                opening_hours: formData.opening_hours,
                is_sponsored: formData.is_sponsored,
                user_count: parseInt(formData.user_count, 10) || 0,
                image_url: images.length > 0 ? images[0].image_url : null,
            })
            .eq('id', placeId);

        if (updateError) {
            setError(updateError.message);
            setIsSubmitting(false);
            return;
        }

        // Sync images
        await supabase.from('place_images').delete().eq('place_id', placeId);
        if (images.length > 0) {
            const imageRecords = images.map(({ image_url }) => ({
                place_id: Number(placeId),
                image_url: image_url,
            }));
            await supabase.from('place_images').insert(imageRecords);
        }

        navigate('/dashboard');
    };

    const emojiOptions = ['☕', '🍻', '🍔', '🌳', '🎨', '💪', '🛍️', '✨', '🛋️'];

    if (loading) return <LoadingScreen message="Indlæser mødested..." />
    if (error && !formData.name) return <div className="p-8 text-center text-red-500">{error}</div>

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Rediger Mødested</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Opdater detaljerne for dit mødested.</p>
            <style>{`.toggle-checkbox:checked { right: 0; border-color: #006B76; } .toggle-checkbox:checked + .toggle-label { background-color: #006B76; }`}</style>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                 {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
                
                <div className="space-y-2">
                    <label className="block text-lg font-semibold text-gray-800 dark:text-dark-text-primary">Ikon</label>
                    <div className="flex items-center space-x-4">
                        <div className="text-5xl p-2 bg-gray-100 dark:bg-dark-surface-light rounded-lg">{formData.icon}</div>
                        <div className="grid grid-cols-5 sm:grid-cols-9 gap-2 flex-1">
                            {emojiOptions.map(e => (
                                <button key={e} type="button" onClick={() => handleInputChange({ target: { name: 'icon', value: e } } as any)} className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${formData.icon === e ? 'bg-primary-light dark:bg-primary/20 scale-110' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-light'}`}>{e}</button>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn på sted</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Billeder</label>
                     <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {images.map(image => (
                            <SmartImage key={image.id} src={image.image_url} alt="Mødested billede" className="w-full h-full object-cover rounded-lg" onRemove={() => removeImage(image.id)} />
                        ))}
                        {images.length < 6 && (
                            <div onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                                <Plus size={32} className="text-gray-400"/>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>
                
                <CategorySelector 
                    value={formData.category_id}
                    onChange={(id) => setFormData(p => ({...p, category_id: id}))}
                    type="place"
                />
                
                <div className="bg-gray-50 dark:bg-dark-surface-light p-4 rounded-lg">
                     <div className="flex items-center justify-between">
                         <label htmlFor="toggle-sponsored" className="text-sm font-semibold text-gray-800 dark:text-dark-text-primary">Sponsoreret?</label>
                         <div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" id="toggle-sponsored" name="is_sponsored" checked={formData.is_sponsored} onChange={handleInputChange} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                            <label htmlFor="toggle-sponsored" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                     </div>
                     {formData.is_sponsored && (
                        <div className="mt-4">
                            <label htmlFor="offer" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Tilbud</label>
                            <input type="text" id="offer" name="offer" value={formData.offer} onChange={handleInputChange} className="w-full px-4 py-3 bg-white dark:bg-dark-surface border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                        </div>
                     )}
                </div>

                 <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Adresse</label>
                    <input type="text" id="address" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Beskrivelse</label>
                    <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required ></textarea>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Telefon</label>
                       <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                     <div>
                       <label htmlFor="openingHours" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Åbningstider</label>
                        <input type="text" id="openingHours" name="opening_hours" value={formData.opening_hours} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                 </div>

                 <div>
                    <label htmlFor="userCount" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Gennemsnitligt antal personer</label>
                    <input type="number" id="userCount" name="user_count" value={formData.user_count} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                
                <div className="pt-2">
                     <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50">
                        {isSubmitting ? 'Gemmer...' : 'Gem Ændringer'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditPlacePage;
