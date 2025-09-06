import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Info, X, UploadCloud, Calendar, Tag, MapPin, Smile, Image as ImageIcon, Loader2, Ticket } from 'lucide-react';
import { uploadFile, fetchPrivateFile } from '../services/s3Service';
import { usePersistentState } from '../hooks/useNotifications';
import CategorySelector from '../components/CategorySelector';
import TagSelector from '../components/TagSelector';
import type { Interest, InterestCategory } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

// This component can display a local blob URL directly or fetch a private S3 URL.
const SmartImage: React.FC<{ src: string; alt: string; className: string; }> = ({ src, alt, className }) => {
    const [displayUrl, setDisplayUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let objectUrlToRevoke: string | null = null;
        let isMounted = true;

        const processUrl = async () => {
            if (!src) {
                if (isMounted) {
                    setIsLoading(false);
                    setDisplayUrl('');
                }
                return;
            }
            
            setIsLoading(true);

            if (src.startsWith('blob:') || src.startsWith('data:')) {
                // It's a local preview blob URL, use it directly.
                setDisplayUrl(src);
                setIsLoading(false);
            } else {
                // It's a permanent S3 URL, fetch it securely to get a temporary blob URL.
                try {
                    const fetchedBlobUrl = await fetchPrivateFile(src);
                    if (isMounted) {
                        objectUrlToRevoke = fetchedBlobUrl;
                        setDisplayUrl(fetchedBlobUrl);
                    }
                } catch(e) {
                    console.error("Failed to fetch private image", e);
                    if (isMounted) setDisplayUrl(''); // Clear on error
                } finally {
                    if (isMounted) setIsLoading(false);
                }
            }
        };

        processUrl();

        return () => {
            isMounted = false;
            if (objectUrlToRevoke) {
                URL.revokeObjectURL(objectUrlToRevoke);
            }
        };
    }, [src]);

    if (isLoading) {
        return (
             <div className={`${className} bg-gray-200 dark:bg-dark-surface-light rounded-lg flex items-center justify-center`}>
                <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
        );
    }
    
    if (!displayUrl) {
        return (
             <div className={`${className} bg-gray-200 dark:bg-dark-surface-light rounded-lg flex items-center justify-center`}>
                <ImageIcon className="text-gray-400" size={24} />
            </div>
        );
    }

    return <img src={displayUrl} alt={alt} className={className} />;
};

const initialFormState = {
    icon: '🎉',
    eventName: '',
    description: '',
    time: '',
    end_time: '',
    location: '',
    isDiagnosisFriendly: false,
    images: [] as string[],
    is_sponsored: false,
    offer: '',
    category_id: null as number | null,
    selectedInterestIds: [] as number[],
};

const CreateEventPage: React.FC = () => {
    const { user } = useAuth();
    const [formData, setFormData] = usePersistentState('createUserEventForm', initialFormState);
    const [isUploading, setIsUploading] = useState(false);
    
    // State for interests
    const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
    const [allInterests, setAllInterests] = useState<Interest[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);


    const imageInputRef = useRef<HTMLInputElement>(null);

     useEffect(() => {
        const fetchTagData = async () => {
            const { data: iCatData } = await supabase.from('interest_categories').select('*').order('name');
            const { data: iData } = await supabase.from('interests').select('*');
            if (iCatData) setInterestCategories(iCatData);
            if (iData) {
                setAllInterests(iData);
                // Hydrate selectedInterests from persisted IDs
                const hydratedInterests = iData.filter(i => formData.selectedInterestIds.includes(i.id));
                setSelectedInterests(hydratedInterests);
            }
        };
        fetchTagData();
    }, []); // formData.selectedInterestIds is not included to prevent re-fetching on every selection

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({...prev, [name]: checked}));
        } else {
            setFormData(prev => ({...prev, [name]: value}));
        }
    };
    
    const handleSimpleStateChange = <K extends keyof typeof initialFormState>(key: K, value: (typeof initialFormState)[K]) => {
        setFormData(p => ({...p, [key]: value}));
    };

    const handleInterestToggle = (interest: Interest) => {
        const newSelected = selectedInterests.some(i => i.id === interest.id) 
            ? selectedInterests.filter(i => i.id !== interest.id)
            : [...selectedInterests, interest];
        setSelectedInterests(newSelected);
        setFormData(p => ({ ...p, selectedInterestIds: newSelected.map(i => i.id) }));
    };

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
    
        const filesToUpload = Array.from(e.target.files).slice(0, 3 - formData.images.length);
        if (filesToUpload.length === 0) return;
    
        setIsUploading(true);
    
        const previews = filesToUpload.map(file => ({
            blobUrl: URL.createObjectURL(file),
            file: file,
        }));
    
        setFormData(p => ({...p, images: [...p.images, ...previews.map(pr => pr.blobUrl)]}));
    
        const uploadPromises = previews.map(p =>
            uploadFile(p.file)
                .then(finalUrl => {
                    setFormData(current => ({...current, images: current.images.map(img => (img === p.blobUrl ? finalUrl : img))}));
                    URL.revokeObjectURL(p.blobUrl);
                })
                .catch(error => {
                    console.error("Error uploading files:", error);
                    alert("Der skete en fejl under upload.");
                    setFormData(current => ({...current, images: current.images.filter(img => img !== p.blobUrl)}));
                    URL.revokeObjectURL(p.blobUrl);
                    throw error;
                })
        );
    
        Promise.allSettled(uploadPromises).finally(() => {
            setIsUploading(false);
        });
    };
    
    const removeImage = (imageToRemove: string) => {
        setFormData(p => ({...p, images: p.images.filter(img => img !== imageToRemove)}));
        if (imageToRemove.startsWith('blob:')) {
            URL.revokeObjectURL(imageToRemove);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            alert('Du skal være logget ind for at oprette et event.');
            return;
        }

        const { eventName, description, time, end_time, location, images, ...rest } = formData;

        // 1. Create the event
        const { data: newEvent, error: eventError } = await supabase.from('events').insert({
            title: eventName,
            description, time, end_time, address: location,
            creator_user_id: user.id,
            host_name: user.name,
            host_avatar_url: user.avatar_url || '',
            organization_id: null,
            image_url: images.length > 0 ? images[0] : null,
            ...rest
        }).select().single();

        if (eventError || !newEvent) {
            console.error(eventError);
            alert('Event kunne ikke oprettes!');
            return;
        }

        // 2. Link images to the new event
        if (images.length > 0) {
            const eventImages = images.map(imageUrl => ({
                event_id: newEvent.id,
                image_url: imageUrl
            }));
            const { error: imageError } = await supabase.from('event_images').insert(eventImages);
            if (imageError) {
                console.error("Error linking images:", imageError);
            }
        }

        // 3. Link interests to the new event using RPC
        if (selectedInterests.length > 0) {
            const interestIds = selectedInterests.map(interest => interest.id);
            const { error: interestError } = await supabase.rpc('add_interests_to_event', {
                p_event_id: newEvent.id,
                p_interest_ids: interestIds
            });
            if (interestError) {
                console.error("Error linking interests:", interestError);
            }
        }
        
        alert('Event oprettet!');
        setFormData(initialFormState); // Clear form and sessionStorage on submit
        setSelectedInterests([]); // Clear local state as well
    };

    const emojiOptions = ['🎉', '🍔', '🎨', '🎲', '🎬', '🚶‍♀️', '🎮', '💪', '🥳', '☕', '🎸', '🍽️'];

    return (
        <div className="p-4 md:p-6 bg-gray-50 h-full overflow-y-auto pb-20">
            <h1 className="text-center text-2xl font-bold text-primary mb-4">SoulMatch</h1>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Lav et socialt event</h1>
                <Info className="text-gray-400" size={24} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                <style>{`.toggle-checkbox:checked { right: 0; border-color: #006B76; } .toggle-checkbox:checked + .toggle-label { background-color: #006B76; }`}</style>
                {/* Emoji */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-lg font-semibold text-gray-800 mb-3">Vælg dit ikon til event</label>
                    <div className="flex items-center space-x-4">
                        <div className="text-5xl">{formData.icon}</div>
                        <div className="grid grid-cols-6 gap-2 flex-1">
                            {emojiOptions.map(e => (
                                <button key={e} type="button" onClick={() => handleSimpleStateChange('icon', e)} className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${formData.icon === e ? 'bg-primary-light scale-110' : 'hover:bg-gray-100'}`}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Event Name & Description */}
                <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                    <div>
                        <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">Navn på event</label>
                        <input
                            type="text" id="eventName" name="eventName" value={formData.eventName} onChange={handleFormChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="F.eks. Tur i biffen" required
                        />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                        <textarea
                            id="description" name="description" rows={4} value={formData.description} onChange={handleFormChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Fortæl lidt om hvad I skal lave..." required
                        ></textarea>
                    </div>
                </div>
                
                <CategorySelector 
                    value={formData.category_id}
                    onChange={(id) => setFormData(p => ({...p, category_id: id}))}
                    type="event"
                />

                {/* Date/Time */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                     <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center"><Calendar size={20} className="mr-2 text-primary"/> Hvornår?</label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Start tidspunkt</label>
                           <input type="datetime-local" id="time" name="time" value={formData.time} onChange={handleFormChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/>
                        </div>
                         <div>
                           <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">Slut tidspunkt</label>
                           <input type="datetime-local" id="end_time" name="end_time" value={formData.end_time} onChange={handleFormChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/>
                        </div>
                     </div>
                </div>

                {/* Interests */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <TagSelector
                        title="Vælg interesser for dit event"
                        categories={interestCategories}
                        allTags={allInterests}
                        selectedTags={selectedInterests}
                        onToggleTag={handleInterestToggle}
                    />
                </div>
                
                 {/* Location */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                     <label htmlFor="location" className="block text-lg font-semibold text-gray-800 mb-3 flex items-center"><MapPin size={20} className="mr-2 text-primary"/> Lokation</label>
                     <input
                        type="text" id="location" name="location" value={formData.location} onChange={handleFormChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Indtast fulde addresse" required
                     />
                </div>
                
                {/* Sponsor */}
                 <div className="bg-white p-4 rounded-lg shadow-sm">
                     <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center"><Ticket size={20} className="mr-2 text-primary"/> Sponsoreret?</label>
                     <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
                         <p className="text-sm text-gray-600 flex-1 mr-4">Tilbyder dette event en speciel rabat eller et tilbud?</p>
                         <div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" id="toggle_sponsored" name="is_sponsored" checked={formData.is_sponsored} onChange={handleFormChange} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                            <label htmlFor="toggle_sponsored" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                     </div>
                     {formData.is_sponsored && (
                        <div>
                           <label htmlFor="offer" className="block text-sm font-medium text-gray-700 mb-1">Tilbud / Rabat</label>
                           <input type="text" id="offer" name="offer" value={formData.offer} onChange={handleFormChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="F.eks. 'Gratis kaffe til de første 10'"/>
                        </div>
                     )}
                </div>

                {/* Diagnosis Friendly */}
                 <div className="bg-white p-4 rounded-lg shadow-sm">
                     <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center"><Smile size={20} className="mr-2 text-primary"/> Diagnose venligt?</label>
                     <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                         <p className="text-sm text-gray-600 flex-1 mr-4">Er dette event designet til at være hensynsfuldt over for deltagere med diagnoser?</p>
                         <div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" id="toggle" name="isDiagnosisFriendly" checked={formData.isDiagnosisFriendly} onChange={handleFormChange} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                            <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                     </div>
                </div>
                
                {/* Image Upload */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center"><ImageIcon size={20} className="mr-2 text-primary"/> Tilføj op til 3 billeder</label>
                    <div className="grid grid-cols-3 gap-4">
                        {formData.images.map((img, index) => (
                             <div key={index} className="relative aspect-square">
                                <SmartImage src={img} alt={`preview ${index}`} className="w-full h-full object-cover rounded-lg"/>
                                {img.startsWith('blob:') && (
                                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg">
                                        <Loader2 className="animate-spin text-white" size={24} />
                                    </div>
                                )}
                                <button type="button" onClick={() => removeImage(img)} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75 z-10"><X size={16}/></button>
                            </div>
                        ))}
                        {formData.images.length < 3 && (
                            <div onClick={() => !isUploading && imageInputRef.current?.click()} className={`flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg transition-colors ${isUploading ? 'cursor-wait bg-gray-100' : 'cursor-pointer hover:bg-gray-100'}`}>
                                {isUploading ? (
                                     <Loader2 className="animate-spin text-gray-400" size={32} />
                                ) : (
                                    <>
                                        <UploadCloud size={32} className="text-gray-400 mb-2"/>
                                        <p className="text-sm text-gray-500 text-center">Upload billede</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <input
                        type="file" ref={imageInputRef} onChange={handleImageUpload}
                        multiple accept="image/*" className="hidden" disabled={isUploading}
                    />
                </div>
                
                {/* Submit */}
                <div>
                     <button
                        type="submit"
                        className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
                    >
                        Opret event
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateEventPage;