import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Info, X, Calendar, Tag, MapPin, Smile, Image as ImageIcon, Loader2, UploadCloud, Plus } from 'lucide-react';
import { uploadFile, fetchPrivateFile } from '../../services/s3Service';
import type { Organization } from '../../types';

// This component can display a local blob URL directly.
const ImagePreview: React.FC<{ src: string; alt: string; className: string; onRemove: () => void; }> = ({ src, alt, className, onRemove }) => {
    return (
        <div className="relative group aspect-square">
            <img src={src} alt={alt} className={className} />
            <button type="button" onClick={onRemove} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"><X size={16}/></button>
        </div>
    );
};


const CreateOrgEventPage: React.FC = () => {
    const navigate = useNavigate();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    const [emoji, setEmoji] = useState('🎉');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [time, setTime] = useState('');
    const [category, setCategory] = useState('');
    const [color, setColor] = useState('bg-blue-100');
    const [address, setAddress] = useState('');
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);


    const [isUploading, setIsUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
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
            setError("Organization data not loaded. Cannot create event.");
            return;
        }
        setIsSubmitting(true);
        setError(null);

        // 1. Upload images to S3
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

        // 2. Insert event into DB
        const { data: newEvent, error: insertError } = await supabase.from('events').insert({
            title, description, time, category, address,
            image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
            icon: emoji, color,
            organization_id: organization.id,
            host_name: organization.name,
            host_avatar_url: organization.logo_url,
        }).select().single();

        if (insertError || !newEvent) {
            setError(insertError?.message || "Kunne ikke oprette event.");
            setIsSubmitting(false);
            return;
        }
        
        // 3. Insert images into event_images table
        if (uploadedImageUrls.length > 0) {
            const imageRecords = uploadedImageUrls.map(url => ({
                event_id: newEvent.id,
                image_url: url,
            }));
            const { error: imageInsertError } = await supabase.from('event_images').insert(imageRecords);
            if (imageInsertError) {
                setError(`Event oprettet, men billeder kunne ikke gemmes: ${imageInsertError.message}`);
                // Don't stop submission, the event is already created.
            }
        }

        navigate('/dashboard');
    };

    const emojiOptions = ['🎉', '🍔', '🎨', '🎲', '🎬', '🚶‍♀️', '🎮', '💪', '🥳', '☕', '🎸', '🍽️'];
    const categoryOptions = ['Mad', 'Events', 'Kultur', 'Brætspil', 'Biograf', 'Gåtur', 'Gaming', 'Træning', 'Fest', 'Musik'];
    const colorOptions = ['bg-blue-100', 'bg-red-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100'];

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>
    }

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Opret et nyt Event</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Udfyld detaljerne for at tilføje et nyt socialt event til SoulMatch.</p>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                 {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
                
                <div>
                    <label className="block text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Vælg et ikon (emoji)</label>
                    <div className="flex items-center space-x-4">
                        <div className="text-5xl p-2 bg-gray-100 dark:bg-dark-surface-light rounded-lg">{emoji}</div>
                        <div className="grid grid-cols-6 gap-2 flex-1">
                            {emojiOptions.map(e => (
                                <button key={e} type="button" onClick={() => setEmoji(e)} className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${emoji === e ? 'bg-primary-light dark:bg-primary/20 scale-110' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-light'}`}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn på event</label>
                    <input
                        type="text" id="title" value={title} onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="F.eks. Hyggelig Brætspilsaften" required
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Event Billeder</label>
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
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Beskrivelse</label>
                    <textarea
                        id="description" rows={4} value={description} onChange={e => setDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Fortæl lidt om hvad I skal lave..." required
                    ></textarea>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Tidspunkt</label>
                       <input type="datetime-local" id="time" value={time} onChange={e => setTime(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/>
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
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Adresse</label>
                    <input
                        type="text" id="address" value={address} onChange={e => setAddress(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="F.eks. Gade 123, 9000 Aalborg" required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Kort farve</label>
                     <div className="flex space-x-2">
                        {colorOptions.map(c => (
                            <button key={c} type="button" onClick={() => setColor(c)} className={`w-10 h-10 rounded-full ${c} border-2 ${color === c ? 'border-primary' : 'border-transparent'}`}></button>
                        ))}
                    </div>
                </div>
                
                <div>
                     <button
                        type="submit"
                        disabled={isSubmitting || isUploading}
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