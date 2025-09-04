import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Event, ImageRecord } from '../../types';
import { uploadFile, fetchPrivateFile } from '../../services/s3Service';
import { Loader2, Plus, X } from 'lucide-react';

// This component can display a local blob URL directly or fetch a private S3 URL.
const SmartImage: React.FC<{ src: string; alt: string; className: string; onRemove: () => void; }> = ({ src, alt, className, onRemove }) => {
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

            if (src.startsWith('blob:')) {
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

const EditOrgEventPage: React.FC = () => {
    const navigate = useNavigate();
    const { eventId } = useParams<{ eventId: string }>();

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '', description: '', time: '', category: '', address: '', icon: '🎉', color: 'bg-blue-100'
    });
    const [images, setImages] = useState<ImageRecord[]>([]);

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
                    category: data.category || '',
                    address: data.address || '',
                    icon: data.icon || '🎉',
                    color: data.color || 'bg-blue-100',
                });
                setImages(data.images || []);
            }
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
            // Create a temporary ID for the key, DB will assign real one
            setImages(prev => [...prev, { id: Date.now(), image_url: url }]);
        } catch (uploadError) {
            setError('Billedupload fejlede.');
        }
    };
    
    const removeImage = (idToRemove: number) => {
        setImages(prev => prev.filter(img => img.id !== idToRemove));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        
        // 1. Update main event details
        const { error: updateError } = await supabase
            .from('events')
            .update({
                ...formData,
                image_url: images.length > 0 ? images[0].image_url : null,
            })
            .eq('id', eventId);

        if (updateError) {
            setError(updateError.message);
            setIsSubmitting(false);
            return;
        }

        // 2. Sync images
        const { error: deleteError } = await supabase.from('event_images').delete().eq('event_id', eventId);
        if (deleteError) { /* Handle error, maybe revert */ }

        if (images.length > 0) {
            const imageRecords = images.map(({ image_url }) => ({
                event_id: Number(eventId),
                image_url: image_url,
            }));
            const { error: insertImagesError } = await supabase.from('event_images').insert(imageRecords);
            if (insertImagesError) {
                setError(`Event opdateret, men billeder kunne ikke gemmes: ${insertImagesError.message}`);
                setIsSubmitting(false);
                return;
            }
        }

        navigate('/dashboard');
    };

    const emojiOptions = ['🎉', '🍔', '🎨', '🎲', '🎬', '🚶‍♀️', '🎮', '💪', '🥳', '☕', '🎸', '🍽️'];
    const categoryOptions = ['Mad', 'Events', 'Kultur', 'Brætspil', 'Biograf', 'Gåtur', 'Gaming', 'Træning', 'Fest', 'Musik'];
    const colorOptions = ['bg-blue-100', 'bg-red-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100'];

    if (loading) return <div className="p-8 text-center">Indlæser event...</div>
    if (error && !formData.title) return <div className="p-8 text-center text-red-500">{error}</div>

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Rediger Event</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Opdater detaljerne for dit event.</p>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                 {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
                
                <div className="space-y-2">
                    <label className="block text-lg font-semibold text-gray-800 dark:text-dark-text-primary">Ikon (emoji)</label>
                    <div className="flex items-center space-x-4">
                        <div className="text-5xl p-2 bg-gray-100 dark:bg-dark-surface-light rounded-lg">{formData.icon}</div>
                        <div className="grid grid-cols-6 gap-2 flex-1">
                            {emojiOptions.map(e => (
                                <button key={e} type="button" onClick={() => setFormData(p => ({...p, icon: e}))} className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${formData.icon === e ? 'bg-primary-light dark:bg-primary/20 scale-110' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-light'}`}>{e}</button>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn på event</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Event Billeder</label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {images.map(image => (
                            <SmartImage key={image.id} src={image.image_url} alt="Event billede" className="w-full h-full object-cover rounded-lg" onRemove={() => removeImage(image.id)} />
                        ))}
                        {images.length < 6 && (
                            <div onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                                <Plus size={32} className="text-gray-400"/>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Beskrivelse</label>
                    <textarea id="description" name="description" rows={4} value={formData.description} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required></textarea>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Tidspunkt</label>
                       <input type="datetime-local" id="time" name="time" value={formData.time} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/>
                    </div>
                     <div>
                       <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Kategori</label>
                        <select id="category" name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required>
                           <option value="" disabled>Vælg en kategori</option>
                           {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                 </div>

                 <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Adresse</label>
                    <input type="text" id="address" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
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
                     <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50">
                        {isSubmitting ? 'Gemmer...' : 'Gem Ændringer'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditOrgEventPage;
