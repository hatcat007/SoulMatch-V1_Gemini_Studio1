
import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Info, X, UploadCloud, Calendar, Tag, MapPin, Smile, Image as ImageIcon, Loader2, Ticket, ArrowLeft } from 'lucide-react';
import { uploadFile, fetchPrivateFile } from '../services/s3Service';
import CategorySelector from '../components/CategorySelector';
import TagSelector from '../components/TagSelector';
import type { Interest, InterestCategory, ImageRecord } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

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

const EditEventPage: React.FC = () => {
    const navigate = useNavigate();
    const { eventId } = useParams<{ eventId: string }>();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({ emoji: '🎉', title: '', description: '', time: '', end_time: '', location: '', is_sponsored: false, offer: '', category_id: null as number | null, });
    const [images, setImages] = useState<{ id?: number; url: string; isNew: boolean }[]>([]);
    
    // Interests state
    const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
    const [allInterests, setAllInterests] = useState<Interest[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
    
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchEventAndTags = async () => {
            if (!eventId) { setError("Event ID mangler."); setLoading(false); return; }

            const { data: eventData, error: eventFetchError } = await supabase
                .from('events')
                .select('*, image_url, images:event_images(id, image_url)')
                .eq('id', eventId)
                .single();

            if (eventFetchError || !eventData) {
                setError(`Kunne ikke hente event: ${eventFetchError?.message || 'Event ikke fundet.'}`);
                setLoading(false); return;
            }

            const { data: interestLinks, error: interestFetchError } = await supabase
                .from('event_interests')
                .select('interest:interests(*)')
                .eq('event_id', eventId);
            
            if (interestFetchError) {
                 console.error("Error fetching event interests, but continuing:", interestFetchError.message);
            }

            setFormData({
                emoji: eventData.icon || '🎉', title: eventData.title || '', description: eventData.description || '',
                time: eventData.time ? new Date(eventData.time).toISOString().slice(0, 16) : '',
                end_time: eventData.end_time ? new Date(eventData.end_time).toISOString().slice(0, 16) : '',
                location: eventData.address || '', is_sponsored: eventData.is_sponsored || false, offer: eventData.offer || '', category_id: eventData.category_id,
            });
            
            const galleryImages = (eventData.images || []).map((img: ImageRecord) => ({ id: img.id, url: img.image_url, isNew: false }));
            const galleryImageUrls = new Set(galleryImages.map(img => img.url));
            let combinedImages = [...galleryImages];
            if (eventData.image_url && !galleryImageUrls.has(eventData.image_url)) {
                combinedImages.unshift({ id: -1, url: eventData.image_url, isNew: false });
            }
            setImages(combinedImages);

            setSelectedInterests(interestLinks?.map((i: any) => i.interest) || []);

            const { data: iCatData } = await supabase.from('interest_categories').select('*').order('name');
            const { data: iData } = await supabase.from('interests').select('*');
            if (iCatData) setInterestCategories(iCatData);
            if (iData) setAllInterests(iData);
            
            setLoading(false);
        };
        fetchEventAndTags();
    }, [eventId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleInterestToggle = (interest: Interest) => {
        setSelectedInterests(prev => prev.some(i => i.id === interest.id) ? prev.filter(i => i.id !== interest.id) : [...prev, interest]);
    };

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        const previewUrl = URL.createObjectURL(file);
        setImages(prev => [...prev, { url: previewUrl, isNew: true }]);

        uploadFile(file)
            .then(finalUrl => {
                setImages(current => current.map(img => (img.url === previewUrl ? { url: finalUrl, isNew: true } : img)));
                URL.revokeObjectURL(previewUrl);
            })
            .catch(err => {
                setError("Billedupload fejlede.");
                setImages(current => current.filter(img => img.url !== previewUrl));
                URL.revokeObjectURL(previewUrl);
            });
    };
    
    const removeImage = (urlToRemove: string) => {
        setImages(p => p.filter(img => img.url !== urlToRemove));
        if (urlToRemove.startsWith('blob:')) {
            URL.revokeObjectURL(urlToRemove);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !eventId) { setError('Bruger eller event ID mangler.'); return; }
        if (!formData.category_id) { setError('Vælg venligst en kategori.'); return; }
        
        setIsSubmitting(true);
        setError(null);

        // 1. Update event
        const { error: eventError } = await supabase.from('events').update({
            title: formData.title,
            description: formData.description,
            time: new Date(formData.time).toISOString(),
            end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
            address: formData.location,
            is_sponsored: formData.is_sponsored, offer: formData.is_sponsored ? formData.offer : '', category_id: formData.category_id,
            icon: formData.emoji, image_url: images.length > 0 ? images[0].url : null,
        }).eq('id', eventId);

        if (eventError) {
            setError(eventError.message); setIsSubmitting(false); return;
        }

        // 2. Sync interests
        await supabase.from('event_interests').delete().eq('event_id', eventId);
        if (selectedInterests.length > 0) {
            const eventInterests = selectedInterests.map(interest => ({ event_id: Number(eventId), interest_id: interest.id }));
            await supabase.from('event_interests').insert(eventInterests);
        }

        // 3. Sync images
        await supabase.from('event_images').delete().eq('event_id', eventId);
        if (images.length > 0) {
            const imageRecords = images.map(img => ({ event_id: Number(eventId), image_url: img.url }));
            await supabase.from('event_images').insert(imageRecords);
        }

        navigate('/my-events');
    };

    const emojiOptions = ['🎉', '🍔', '🎨', '🎲', '🎬', '🚶‍♀️', '🎮', '💪', '🥳', '☕', '🎸', '🍽️'];

    if (loading) return <LoadingScreen message="Indlæser event..." />;
    if (error && !formData.title) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="p-4 md:p-6 bg-gray-50 h-full overflow-y-auto pb-20">
            <header className="flex items-center justify-between mb-6 max-w-2xl mx-auto">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Rediger Event</h1>
                <div className="w-8"></div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                <style>{`.toggle-checkbox:checked { right: 0; border-color: #006B76; } .toggle-checkbox:checked + .toggle-label { background-color: #006B76; }`}</style>
                
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="grid grid-cols-3 gap-4">
                        {images.map((img) => (
                             <SmartImage key={img.id || img.url} src={img.url} alt="event preview" className="w-full h-full object-cover rounded-lg" onRemove={() => removeImage(img.url)}/>
                        ))}
                        {images.length < 3 && (
                            <div onClick={() => imageInputRef.current?.click()} className={`flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100`}>
                                <UploadCloud size={32} className="text-gray-400 mb-2"/>
                                <p className="text-sm text-gray-500 text-center">Upload billede</p>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} multiple accept="image/*" className="hidden"/>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Navn på event</label>
                        <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                        <textarea id="description" name="description" rows={4} value={formData.description} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required></textarea>
                    </div>
                </div>

                <CategorySelector value={formData.category_id} onChange={(id) => setFormData(p => ({...p, category_id: id}))} type="event"/>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Start tidspunkt</label>
                           <input type="datetime-local" id="time" name="time" value={formData.time} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/>
                        </div>
                         <div>
                           <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">Slut tidspunkt</label>
                           <input type="datetime-local" id="end_time" name="end_time" value={formData.end_time} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/>
                        </div>
                     </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <TagSelector title="Rediger interesser for dit event" categories={interestCategories} allTags={allInterests} selectedTags={selectedInterests} onToggleTag={handleInterestToggle}/>
                </div>
                
                 <div className="bg-white p-4 rounded-lg shadow-sm">
                     <label htmlFor="location" className="block text-lg font-semibold text-gray-800 mb-3 flex items-center"><MapPin size={20} className="mr-2 text-primary"/> Lokation</label>
                     <input type="text" id="location" name="location" value={formData.location} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/>
                </div>
                
                 <div className="bg-white p-4 rounded-lg shadow-sm">
                     <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
                         <p className="text-sm text-gray-600 flex-1 mr-4">Tilbyder dette event en speciel rabat eller et tilbud?</p>
                         <div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" id="toggle_sponsored" name="is_sponsored" checked={formData.is_sponsored} onChange={handleInputChange} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                            <label htmlFor="toggle_sponsored" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                     </div>
                     {formData.is_sponsored && (
                        <div>
                           <label htmlFor="offer" className="block text-sm font-medium text-gray-700 mb-1">Tilbud / Rabat</label>
                           <input type="text" id="offer" name="offer" value={formData.offer} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"/>
                        </div>
                     )}
                </div>
                
                <div>
                     <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg">
                        {isSubmitting ? 'Gemmer...' : 'Gem Ændringer'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditEventPage;
