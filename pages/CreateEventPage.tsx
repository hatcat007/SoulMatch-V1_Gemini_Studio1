import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Info, X, UploadCloud, Calendar, Tag, MapPin, Smile, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadFile, fetchPrivateFile } from '../services/s3Service';

// Mock data for user's interests
const userInterests = ['Gaming', 'Film', 'Kaffe', 'Brætspil', 'Musik', 'Gåtur'];

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

            if (src.startsWith('blob:')) {
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


const CreateEventPage: React.FC = () => {
    const [emoji, setEmoji] = useState('🎉');
    const [eventName, setEventName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [location, setLocation] = useState('');
    const [isDiagnosisFriendly, setIsDiagnosisFriendly] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim() !== '') {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const addTag = (tag: string) => {
        if (!tags.includes(tag)) {
            setTags([...tags, tag]);
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
    
        const filesToUpload = Array.from(e.target.files).slice(0, 3 - images.length);
        if (filesToUpload.length === 0) return;
    
        setIsUploading(true);
    
        const previews = filesToUpload.map(file => ({
            blobUrl: URL.createObjectURL(file),
            file: file,
        }));
    
        setImages(prev => [...prev, ...previews.map(p => p.blobUrl)]);
    
        const uploadPromises = previews.map(p =>
            uploadFile(p.file)
                .then(finalUrl => {
                    setImages(currentImages =>
                        currentImages.map(img => (img === p.blobUrl ? finalUrl : img))
                    );
                    URL.revokeObjectURL(p.blobUrl);
                })
                .catch(error => {
                    console.error("Error uploading files:", error);
                    alert("Der skete en fejl under upload.");
                    setImages(currentImages => currentImages.filter(img => img !== p.blobUrl));
                    URL.revokeObjectURL(p.blobUrl);
                    throw error;
                })
        );
    
        Promise.allSettled(uploadPromises).finally(() => {
            setIsUploading(false);
        });
    };
    
    const removeImage = (imageToRemove: string) => {
        setImages(images.filter(img => img !== imageToRemove));
        if (imageToRemove.startsWith('blob:')) {
            URL.revokeObjectURL(imageToRemove);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log({
            emoji,
            eventName,
            description,
            startDate,
            endDate,
            tags,
            location,
            isDiagnosisFriendly,
            images,
        });
        alert('Event oprettet! (Se konsol for data)');
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
                {/* Emoji */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-lg font-semibold text-gray-800 mb-3">Vælg dit emoji til event</label>
                    <div className="flex items-center space-x-4">
                        <div className="text-5xl">{emoji}</div>
                        <div className="grid grid-cols-6 gap-2 flex-1">
                            {emojiOptions.map(e => (
                                <button key={e} type="button" onClick={() => setEmoji(e)} className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${emoji === e ? 'bg-primary-light scale-110' : 'hover:bg-gray-100'}`}>
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
                            type="text" id="eventName" value={eventName} onChange={e => setEventName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="F.eks. Tur i biffen" required
                        />
                    </div>
                    <div>
                        <label htmlFor="eventDescription" className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                        <textarea
                            id="eventDescription" rows={4} value={description} onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Fortæl lidt om hvad I skal lave..." required
                        ></textarea>
                    </div>
                </div>
                
                {/* Date/Time */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                     <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center"><Calendar size={20} className="mr-2 text-primary"/> Hvornår?</label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start tidspunkt</label>
                           <input type="datetime-local" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/>
                        </div>
                         <div>
                           <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Slut tidspunkt</label>
                           <input type="datetime-local" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required/>
                        </div>
                     </div>
                </div>

                {/* Tags */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                     <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center"><Tag size={20} className="mr-2 text-primary"/> Tags</label>
                     <div className="mb-2">
                         <p className="text-sm font-medium text-gray-700 mb-2">Forslag baseret på dine interesser:</p>
                         <div className="flex flex-wrap gap-2">
                             {userInterests.map(interest => (
                                 <button key={interest} type="button" onClick={() => addTag(interest)} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm hover:bg-gray-300">
                                     + {interest}
                                 </button>
                             ))}
                         </div>
                     </div>
                     <div className="flex flex-wrap items-center gap-2 mb-3 min-h-[2rem]">
                         {tags.map(tag => (
                            <div key={tag} className="flex items-center bg-primary text-white px-3 py-1 rounded-full text-sm">
                                <span>{tag}</span>
                                <button type="button" onClick={() => removeTag(tag)} className="ml-2 -mr-1 text-white hover:bg-primary-dark rounded-full p-0.5"><X size={14}/></button>
                            </div>
                         ))}
                     </div>
                     <input
                        type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Tilføj dine egne tags (tryk Enter)"
                     />
                </div>
                
                 {/* Location */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                     <label htmlFor="location" className="block text-lg font-semibold text-gray-800 mb-3 flex items-center"><MapPin size={20} className="mr-2 text-primary"/> Lokation</label>
                     <input
                        type="text" id="location" value={location} onChange={e => setLocation(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Indtast fulde addresse" required
                     />
                </div>
                
                {/* Diagnosis Friendly */}
                 <div className="bg-white p-4 rounded-lg shadow-sm">
                     <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center"><Smile size={20} className="mr-2 text-primary"/> Diagnose venligt?</label>
                     <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                         <p className="text-sm text-gray-600 flex-1 mr-4">Er dette event designet til at være hensynsfuldt over for deltagere med diagnoser?</p>
                         <div className="relative inline-block w-12 flex-shrink-0 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" id="toggle" checked={isDiagnosisFriendly} onChange={() => setIsDiagnosisFriendly(!isDiagnosisFriendly)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                            <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                        <style>{`.toggle-checkbox:checked { right: 0; border-color: #006B76; } .toggle-checkbox:checked + .toggle-label { background-color: #006B76; }`}</style>
                     </div>
                </div>
                
                {/* Image Upload */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center"><ImageIcon size={20} className="mr-2 text-primary"/> Tilføj op til 3 billeder</label>
                    <div className="grid grid-cols-3 gap-4">
                        {images.map((img, index) => (
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
                        {images.length < 3 && (
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