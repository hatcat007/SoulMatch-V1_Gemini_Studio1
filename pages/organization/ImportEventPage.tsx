
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { generateEventImageFromText, importEventFromMultimodal } from '../../services/geminiService';
import { fetchPrivateFile } from '../../services/s3Service';
import type { Organization, Category, Activity, Interest, InterestCategory } from '../../types';
import type { ImportedEventData } from '../../services/geminiService';
import { Sparkles, Loader2, ArrowLeft, Image as ImageIcon, X, FileText, UploadCloud, Palette, XCircle, CheckCircle } from 'lucide-react';
import { usePersistentState } from '../../hooks/useNotifications';
import CategorySelector from '../../components/CategorySelector';
import TagSelector from '../../components/TagSelector';

const emojiOptions = ['🎉', '🍔', '🎨', '🎲', '🎬', '🚶‍♀️', '🎮', '💪', '🥳', '☕', '🎸', '🍽️'];
const colorOptions = ['bg-blue-100', 'bg-red-100', 'bg-green-100', 'bg-yellow-100', 'bg-indigo-100', 'bg-pink-100', 'bg-teal-100', 'bg-orange-100', 'bg-cyan-100'];
const emojiMenuOptions: { level: 'ai' | 'none' | 'some' | 'many'; label: string }[] = [
    { level: 'ai', label: 'Lad AI beslutte' }, { level: 'none', label: 'Ingen emojis' },
    { level: 'some', label: 'En smule' }, { level: 'many', label: 'Mange' },
];

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });

const PrivateImage: React.FC<{src: string, onRemove?: () => void, className?: string}> = ({ src, onRemove, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        setIsLoading(true);
        fetchPrivateFile(src).then(url => {
            objectUrl = url;
            setImageUrl(url);
            setIsLoading(false);
        });
        return () => {
            if (objectUrl && objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
        };
    }, [src]);

    if (isLoading) return <div className={`aspect-square bg-gray-200 dark:bg-dark-surface-light animate-pulse rounded-lg ${className}`} />;
    
    return (
        <div className={`relative group aspect-square ${className}`}>
            <img src={imageUrl} alt="AI generated for event" className="w-full h-full object-cover rounded-lg"/>
            {onRemove && <button type="button" onClick={onRemove} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>}
        </div>
    );
};

const initialFormData = { 
    title: '', description: '', time: '', end_time: '', address: '', 
    category_id: null as number | null, emoji: '🎉', color: 'bg-blue-100', 
    image_urls: [] as string[],
    selectedActivityIds: [] as number[],
    selectedInterestIds: [] as number[],
};
type FileObject = { name: string; type: string; data: string; preview: string };
type BatchResult = { success: boolean; data?: ImportedEventData & { image_urls?: string[] }; error?: string; sourceFileName: string; }

const ImportEventPage: React.FC = () => {
    const navigate = useNavigate();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    
    const [allActivities, setAllActivities] = useState<Activity[]>([]);
    const [allInterests, setAllInterests] = useState<Interest[]>([]);
    const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
    
    const [state, setState] = usePersistentState('importEventState', {
        mode: 'choice' as 'choice' | 'single' | 'batch',
        step: 'input' as 'input' | 'loading' | 'form' | 'review',
        eventText: '',
        files: [] as FileObject[],
        formData: initialFormData,
        batchResults: [] as BatchResult[],
        dateTimeOptions: [] as string[],
        pendingImportData: null as ImportedEventData | null,
    });

    const updateState = (newState: Partial<typeof state>) => {
        setState(prev => ({ ...prev, ...newState }));
    };

    const [error, setError] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState('');
    const [imageGenerationStyle, setImageGenerationStyle] = useState<'realistic' | 'illustration' | 'none'>('realistic');
    const [includeTitleOnImage, setIncludeTitleOnImage] = useState(true);
    const [emojiLevel, setEmojiLevel] = useState<'ai' | 'none' | 'some' | 'many'>('ai');
    const [numberOfImages, setNumberOfImages] = useState(1);
    const [descriptionBehavior, setDescriptionBehavior] = useState<'improve' | 'format_only'>('improve');

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: orgData } = await supabase.from('organizations').select('*').eq('auth_id', user.id).single();
                setOrganization(orgData);
            }
            const { data: categoryData } = await supabase.from('categories').select('id, name').eq('type', 'event').not('parent_id', 'is', null);
            if (categoryData) setCategoryOptions(categoryData.map(c => c.name));

            const { data: activitiesData } = await supabase.from('activities').select('*').eq('approved', true);
            if (activitiesData) setAllActivities(activitiesData);

            const { data: interestsData } = await supabase.from('interests').select('*').eq('approved', true);
            if (interestsData) setAllInterests(interestsData);

            const { data: interestCatData } = await supabase.from('interest_categories').select('*');
            if (interestCatData) setInterestCategories(interestCatData);

            setPageLoading(false);
        };
        fetchInitialData();
    }, []);
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selectedFiles = Array.from(e.target.files).slice(0, 8 - state.files.length);
        if (selectedFiles.length === 0) return;
        
        const newFileObjects: FileObject[] = await Promise.all(selectedFiles.map(async file => ({
            name: file.name,
            type: file.type,
            data: await fileToBase64(file),
            preview: URL.createObjectURL(file),
        })));
        updateState({ files: [...state.files, ...newFileObjects] });
    };

    const handleImport = async () => {
        if (!state.eventText.trim() && state.files.length === 0) { setError('Indsæt venligst tekst eller upload filer.'); return; }
        updateState({ step: 'loading' });
        setError(null);

        try {
            setImportStatus('Analyserer indhold...');
            const filesToProcess = state.files.map(f => ({ mimeType: f.type, data: f.data }));
            const importedData = await importEventFromMultimodal(state.eventText, filesToProcess, categoryOptions, emojiOptions, emojiLevel, allActivities, allInterests, descriptionBehavior);
            if (importedData.error) throw new Error(importedData.error);
            
            if (importedData.datetime_options && importedData.datetime_options.length > 1) {
                updateState({ dateTimeOptions: importedData.datetime_options, pendingImportData: importedData, step: 'input' });
            } else {
                await processImportedData(importedData);
            }
        } catch (err: any) {
            setError(`Fejl ved import: ${err.message}`);
            updateState({ step: 'input' });
        } finally {
            setImportStatus('');
        }
    };
    
    const processImportedData = async (data: ImportedEventData) => {
        let categoryId: number | null = null;
        if (data.category) {
             const { data: cat } = await supabase.from('categories').select('id').eq('name', data.category).eq('type', 'event').single();
             if (cat) categoryId = cat.id;
        }

        let imageUrls: string[] = [];
        if (imageGenerationStyle !== 'none') {
            setImportStatus(`Genererer ${numberOfImages} billede(r)...`);
            const base64Images = await generateEventImageFromText(data.description, imageGenerationStyle, data.title, includeTitleOnImage, numberOfImages);
            setImportStatus('Klargør billeder...');
            imageUrls = base64Images.map(base64 => `data:image/jpeg;base64,${base64}`);
        }
        
        const activityIds = data.suggested_activity_names ? allActivities.filter(a => data.suggested_activity_names!.includes(a.name)).map(a => a.id) : [];
        const interestIds = data.suggested_interest_names ? allInterests.filter(i => data.suggested_interest_names!.includes(i.name)).map(i => i.id) : [];
        
        updateState({
            formData: {
                title: data.title || '',
                description: data.description || '',
                time: data.datetime ? new Date(data.datetime).toISOString().slice(0, 16) : '',
                end_time: data.end_time ? new Date(data.end_time).toISOString().slice(0, 16) : '',
                address: data.address || '',
                category_id: categoryId,
                emoji: data.emoji || '🎉',
                image_urls: imageUrls,
                color: 'bg-blue-100',
                selectedActivityIds: activityIds,
                selectedInterestIds: interestIds,
            },
            step: 'form', dateTimeOptions: [], pendingImportData: null
        });
    };

    const handleBatchImport = async () => {
        if (state.files.length === 0) { setError('Upload venligst en eller flere filer.'); return; }
        updateState({ step: 'loading' });
        setError(null);

        const results: BatchResult[] = [];
        for (let i = 0; i < state.files.length; i++) {
            const file = state.files[i];
            try {
                setImportStatus(`Behandler fil ${i + 1} af ${state.files.length}: ${file.name}`);
                const importedData = await importEventFromMultimodal('', [{ mimeType: file.type, data: file.data }], categoryOptions, emojiOptions, emojiLevel, allActivities, allInterests, descriptionBehavior);
                if (importedData.error) {
                    throw new Error(importedData.error);
                }

                let imageUrls: string[] = [];
                if (imageGenerationStyle !== 'none') {
                    setImportStatus(`Genererer billede(r) for ${importedData.title}...`);
                    const base64Images = await generateEventImageFromText(importedData.description, imageGenerationStyle, importedData.title, includeTitleOnImage, numberOfImages);
                    setImportStatus('Klargør billeder...');
                    imageUrls = base64Images.map(base64 => `data:image/jpeg;base64,${base64}`);
                }
                results.push({ success: true, data: { ...importedData, image_urls: imageUrls }, sourceFileName: file.name });
            } catch (err: any) {
                console.error(`Fejl ved behandling af fil ${file.name}:`, err.message);
                results.push({ success: false, error: err.message, sourceFileName: file.name });
            }
        }
        updateState({ batchResults: results, step: 'review' });
    };

    const handleConfirmBatch = async () => {
        const successfulResults = state.batchResults.filter(r => r.success && r.data);
        if (!organization || successfulResults.length === 0) return;

        updateState({ step: 'loading' });
        setImportStatus(`Opretter ${successfulResults.length} events...`);

        try {
            const eventsToInsertPromises = successfulResults.map(async (result) => {
                const data = result.data!;
                let categoryId: number | null = null;
                if (data.category) {
                    const { data: cat } = await supabase.from('categories').select('id').eq('name', data.category).eq('type', 'event').single();
                    if (cat) categoryId = cat.id;
                }
                return {
                    title: data.title, description: data.description, time: data.datetime, end_time: data.end_time,
                    address: data.address, category_id: categoryId, icon: data.emoji || '🎉',
                    color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
                    image_url: data.image_urls?.[0] || null,
                    organization_id: organization.id, host_name: organization.name, host_avatar_url: organization.logo_url,
                };
            });
            const eventsToInsert = await Promise.all(eventsToInsertPromises);
            
            const validEventsToInsert = eventsToInsert.filter(e => e.category_id);
            const successfulResultsWithCategory = successfulResults.filter((_, i) => eventsToInsert[i].category_id);
            
            const { data: newEvents, error: insertError } = await supabase.from('events').insert(validEventsToInsert).select();
            if (insertError) throw insertError;

            const imageRecords = newEvents.flatMap((event, i) => {
                const resultData = successfulResultsWithCategory[i].data;
                return resultData?.image_urls?.map(url => ({ event_id: event.id, image_url: url })) || [];
            });

            if (imageRecords.length > 0) await supabase.from('event_images').insert(imageRecords);

            const rpcPromises = newEvents.flatMap((event, i) => {
                const resultData = successfulResultsWithCategory[i].data;
                const promises = [];

                if (resultData?.suggested_activity_names && resultData.suggested_activity_names.length > 0) {
                    const activityIds = allActivities.filter(a => resultData.suggested_activity_names!.includes(a.name)).map(a => a.id);
                    if (activityIds.length > 0) promises.push(supabase.rpc('add_activities_to_event', { p_event_id: event.id, p_activity_ids: activityIds }));
                }

                if (resultData?.suggested_interest_names && resultData.suggested_interest_names.length > 0) {
                    const interestIds = allInterests.filter(i => resultData.suggested_interest_names!.includes(i.name)).map(i => i.id);
                    if (interestIds.length > 0) promises.push(supabase.rpc('add_interests_to_event', { p_event_id: event.id, p_interest_ids: interestIds }));
                }
                return promises;
            });

            await Promise.all(rpcPromises);

            handleReset();
            navigate('/dashboard');
        } catch (err: any) {
            setError(`Fejl ved oprettelse af events: ${err.message}`);
            updateState({ step: 'review' });
        }
    };
    
    const handleReset = () => {
        updateState({
            mode: 'choice', step: 'input', eventText: '', files: [],
            formData: initialFormData, batchResults: [],
            dateTimeOptions: [], pendingImportData: null,
        });
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) {
            setError("Organisationsdata ikke indlæst. Kan ikke oprette event.");
            return;
        }
        if (!state.formData.category_id) {
            setError("Vælg venligst en kategori.");
            return;
        }
        updateState({ step: 'loading' });
        setImportStatus('Opretter event...');
        setError(null);

        try {
            const { data: newEvent, error: insertError } = await supabase.from('events').insert({
                title: state.formData.title,
                description: state.formData.description,
                time: new Date(state.formData.time).toISOString(),
                end_time: state.formData.end_time ? new Date(state.formData.end_time).toISOString() : null,
                is_sponsored: false,
                offer: '',
                category_id: state.formData.category_id,
                address: state.formData.address,
                image_url: state.formData.image_urls.length > 0 ? state.formData.image_urls[0] : null,
                icon: state.formData.emoji,
                color: state.formData.color,
                organization_id: organization.id,
                host_name: organization.name,
                host_avatar_url: organization.logo_url,
            }).select().single();

            if (insertError) throw insertError;
            if (!newEvent) throw new Error("Event-oprettelse returnerede ingen data.");

            if (state.formData.image_urls.length > 0) {
                const imageRecords = state.formData.image_urls.map(url => ({ event_id: newEvent.id, image_url: url }));
                const { error: imageError } = await supabase.from('event_images').insert(imageRecords);
                if (imageError) {
                    console.warn('Event oprettet, men billeder kunne ikke gemmes:', imageError.message);
                }
            }
            
            if (state.formData.selectedActivityIds.length > 0) {
                await supabase.rpc('add_activities_to_event', { p_event_id: newEvent.id, p_activity_ids: state.formData.selectedActivityIds });
            }
            if (state.formData.selectedInterestIds.length > 0) {
                await supabase.rpc('add_interests_to_event', { p_event_id: newEvent.id, p_interest_ids: state.formData.selectedInterestIds });
            }

            handleReset();
            navigate('/dashboard');

        } catch (err: any) {
            setError(`Fejl ved oprettelse af event: ${err.message}`);
            updateState({ step: 'form' });
        } finally {
            setImportStatus('');
        }
    };

    const renderChoice = () => (
        <div className="text-center p-8 space-y-4">
            <h2 className="text-2xl font-bold">Vil du oprette et event eller flere på en gang?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => updateState({ mode: 'single' })} className="w-full sm:w-auto bg-primary text-white font-bold py-3 px-6 rounded-full text-lg">Et enkelt event</button>
                <button onClick={() => updateState({ mode: 'batch' })} className="w-full sm:w-auto bg-primary-light text-primary font-bold py-3 px-6 rounded-full text-lg">Flere events</button>
            </div>
        </div>
    );
    
    const renderSingleInput = () => (
        <div className="space-y-6">
            <textarea id="eventText" value={state.eventText} onChange={e => updateState({eventText: e.target.value})} rows={6} className="w-full input-style" placeholder="Indsæt event tekst her... (valgfrit)" />
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Upload filer (op til 8)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600"><label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark"><span>Upload en fil</span><input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*,application/pdf" onChange={handleFileChange} /></label><p className="pl-1">eller træk og slip</p></div>
                        <p className="text-xs text-gray-500">PNG, JPG, PDF op til 10MB</p>
                    </div>
                </div>
                 <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {state.files.map(file => (
                        <div key={file.name} className="relative group text-xs">
                            {file.type.startsWith('image/') ? <img src={file.preview} alt={file.name} className="w-full h-20 object-cover rounded-md"/> : <div className="w-full h-20 rounded-md bg-gray-100 flex items-center justify-center p-2"><FileText className="w-8 h-8 text-gray-400 mr-2"/><span className="truncate">{file.name}</span></div>}
                            <button onClick={() => updateState({ files: state.files.filter(f => f.name !== file.name) })} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={12} /></button>
                        </div>
                    ))}
                </div>
            </div>
            {renderAISettings()}
            <button onClick={handleImport} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg flex items-center justify-center"><Sparkles size={20} className="mr-2" />Import med AI</button>
        </div>
    );
    
    const renderBatchInput = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Upload alle dine event-filer</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md"><div className="space-y-1 text-center"><UploadCloud className="mx-auto h-12 w-12 text-gray-400" /><div className="flex text-sm text-gray-600"><label htmlFor="file-upload-batch" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark"><span>Upload filer</span><input id="file-upload-batch" name="file-upload-batch" type="file" className="sr-only" multiple accept="image/*,application/pdf" onChange={handleFileChange} /></label><p className="pl-1">eller træk og slip</p></div></div></div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {state.files.map(file => (<div key={file.name} className="relative group text-xs"><div className="w-full h-20 rounded-md bg-gray-100 flex items-center justify-center p-2"><FileText className="w-8 h-8 text-gray-400 mr-2"/><span className="truncate">{file.name}</span></div><button onClick={() => updateState({ files: state.files.filter(f => f.name !== file.name) })} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={12} /></button></div>))}
                </div>
            </div>
            {renderAISettings(true)}
            <button onClick={handleBatchImport} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg flex items-center justify-center"><Sparkles size={20} className="mr-2" />Importer Events</button>
        </div>
    );

    const renderAISettings = (isBatch = false) => (
        <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Beskrivelses-adfærd</label>
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setDescriptionBehavior('improve')} className={`p-3 rounded-lg border-2 text-sm font-semibold ${descriptionBehavior === 'improve' ? 'border-primary bg-primary-light dark:bg-primary/20' : 'bg-gray-50 dark:bg-dark-surface-light hover:border-gray-300 dark:hover:border-dark-border'}`}>
                        Forbedre Beskrivelse
                    </button>
                    <button type="button" onClick={() => setDescriptionBehavior('format_only')} className={`p-3 rounded-lg border-2 text-sm font-semibold ${descriptionBehavior === 'format_only' ? 'border-primary bg-primary-light dark:bg-primary/20' : 'bg-gray-50 dark:bg-dark-surface-light hover:border-gray-300 dark:hover:border-dark-border'}`}>
                        Formater Kun
                    </button>
                </div>
            </div>
            {!isBatch && <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Emojis i beskrivelse</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{emojiMenuOptions.map(option => (<button key={option.level} type="button" onClick={() => setEmojiLevel(option.level)} className={`text-center p-3 rounded-lg border-2 text-sm font-semibold ${emojiLevel === option.level ? 'border-primary bg-primary-light dark:bg-primary/20' : 'border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface-light hover:border-gray-400'}`}>{option.label}</button>))}</div>
            </div>}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Generer billeder til eventet</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                    <button type="button" onClick={() => setImageGenerationStyle('realistic')} className={`p-3 rounded-lg border-2 flex flex-col items-center ${imageGenerationStyle === 'realistic' ? 'border-primary bg-primary-light' : 'bg-gray-50 hover:border-gray-400'}`}><ImageIcon size={24} className="mb-1 text-primary"/><span className="text-sm font-semibold">Realistisk</span></button>
                    <button type="button" onClick={() => setImageGenerationStyle('illustration')} className={`p-3 rounded-lg border-2 flex flex-col items-center ${imageGenerationStyle === 'illustration' ? 'border-primary bg-primary-light' : 'bg-gray-50 hover:border-gray-400'}`}><Palette size={24} className="mb-1 text-primary"/><span className="text-sm font-semibold">Illustration</span></button>
                    <button type="button" onClick={() => setImageGenerationStyle('none')} className={`p-3 rounded-lg border-2 flex flex-col items-center ${imageGenerationStyle === 'none' ? 'border-gray-500 bg-gray-200' : 'bg-gray-50 hover:border-gray-400'}`}><XCircle size={24} className="mb-1 text-gray-500"/><span className="text-sm font-semibold">Intet billede</span></button>
                </div>
                {imageGenerationStyle !== 'none' && (<div className="space-y-3"><label className="block text-sm font-medium">Antal billeder</label><div className="flex justify-between bg-gray-50 p-2 rounded-lg">{[1, 2, 3, 4].map(num => (<button key={num} type="button" onClick={() => setNumberOfImages(num)} className={`w-10 h-10 rounded-md font-bold text-sm ${numberOfImages === num ? 'bg-primary text-white' : 'bg-white hover:bg-gray-200'}`}>{num}</button>))}</div><label htmlFor="includeTitleToggle" className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border cursor-pointer"><span className="font-medium text-sm">Inkluder titel</span><div className="relative inline-block w-10 flex-shrink-0 align-middle"><input type="checkbox" id="includeTitleToggle" checked={includeTitleOnImage} onChange={(e) => setIncludeTitleOnImage(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" /><label htmlFor="includeTitleToggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label></div></label></div>)}
            </div>
        </div>
    );
    
    const renderReview = () => {
        const successfulImports = state.batchResults.filter(r => r.success);
        const failedImports = state.batchResults.filter(r => !r.success);

        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Gennemse Importerede Events</h2>
                
                {/* Successful Section */}
                <div>
                    <h3 className="text-lg font-semibold text-green-600">Succesfulde Imports ({successfulImports.length})</h3>
                    {successfulImports.length > 0 ? (
                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 mt-2">
                            {successfulImports.map((result, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-dark-surface-light p-3 rounded-lg">
                                    <h4 className="font-bold">{result.data?.title}</h4>
                                    <p className="text-sm text-gray-500">{result.data?.datetime ? new Date(result.data.datetime).toLocaleString('da-DK') : 'Tidspunkt mangler'}</p>
                                    <div className="grid grid-cols-4 gap-2 mt-2">{result.data?.image_urls?.map(url => <PrivateImage key={url} src={url} className="aspect-square"/>)}</div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-gray-500 mt-2">Ingen events blev importeret succesfuldt.</p>}
                </div>

                {/* Failed Section */}
                {failedImports.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-red-500">Fejlede Imports ({failedImports.length})</h3>
                        <div className="space-y-2 max-h-[20vh] overflow-y-auto pr-2 mt-2">
                            {failedImports.map((result, index) => (
                                <div key={index} className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                    <p className="font-semibold text-sm text-red-800 dark:text-red-300">{result.sourceFileName}</p>
                                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">{result.error}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-4">
                    <button onClick={() => updateState({ step: 'input', files: [], batchResults: [] })} className="w-full bg-gray-200 dark:bg-dark-surface-light font-bold py-3 rounded-full">Prøv Igen</button>
                    <button onClick={handleConfirmBatch} disabled={successfulImports.length === 0} className="w-full bg-primary text-white font-bold py-3 rounded-full flex items-center justify-center disabled:opacity-50">
                        <CheckCircle size={20} className="mr-2" />
                        Opret {successfulImports.length} Event(s)
                    </button>
                </div>
            </div>
        );
    };

    const renderForm = () => {
        const selectedActivities = allActivities.filter(a => state.formData.selectedActivityIds.includes(a.id));
        const selectedInterests = allInterests.filter(i => state.formData.selectedInterestIds.includes(i.id));

        const allActivitiesForSelector = allActivities.map(a => ({ ...a, category_id: 0 }));
        const selectedActivitiesForSelector = selectedActivities.map(a => ({ ...a, category_id: 0 }));

        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Bekræft Event Detaljer</h2><button type="button" onClick={handleReset} className="flex items-center text-sm font-semibold text-primary hover:underline"><ArrowLeft size={16} className="mr-1" /> Start forfra</button></div>
                {state.formData.image_urls.length > 0 && <div><label className="block text-sm font-medium mb-1">AI-genererede billeder</label><div className="grid grid-cols-2 gap-2">{state.formData.image_urls.map((url, i) => (<PrivateImage key={i} src={url} onRemove={() => updateState({ formData: {...state.formData, image_urls: state.formData.image_urls.filter((_, idx) => i !== idx)} })} className="aspect-square"/>))}</div></div>}
                <div><label htmlFor="title" className="block text-sm font-medium mb-1">Navn</label><input type="text" id="title" name="title" value={state.formData.title} onChange={e => updateState({ formData: {...state.formData, title: e.target.value} })} className="w-full input-style" required /></div>
                <div><label htmlFor="description" className="block text-sm font-medium mb-1">Beskrivelse</label><textarea id="description" name="description" rows={5} value={state.formData.description} onChange={e => updateState({ formData: {...state.formData, description: e.target.value} })} className="w-full input-style" required /></div>
                <CategorySelector value={state.formData.category_id} onChange={(id) => updateState({ formData: {...state.formData, category_id: id} })} type="event" />
                <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm -m-4 mt-4">
                    <TagSelector
                        title="Foreslåede aktiviteter"
                        categories={[]}
                        allTags={allActivitiesForSelector}
                        selectedTags={selectedActivitiesForSelector}
                        onToggleTag={(tag) => {
                            const newIds = state.formData.selectedActivityIds.includes(tag.id) ? state.formData.selectedActivityIds.filter(id => id !== tag.id) : [...state.formData.selectedActivityIds, tag.id];
                            updateState({ formData: { ...state.formData, selectedActivityIds: newIds }});
                        }}
                        containerHeight="h-auto"
                    />
                </div>
                <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm -m-4 mt-4">
                    <TagSelector
                        title="Foreslåede interesser"
                        categories={interestCategories}
                        allTags={allInterests}
                        selectedTags={selectedInterests}
                        onToggleTag={(tag) => {
                             const newIds = state.formData.selectedInterestIds.includes(tag.id) ? state.formData.selectedInterestIds.filter(id => id !== tag.id) : [...state.formData.selectedInterestIds, tag.id];
                            updateState({ formData: { ...state.formData, selectedInterestIds: newIds }});
                        }}
                        containerHeight="h-auto"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="time" className="block text-sm font-medium mb-1">Start tidspunkt</label>
                        <input type="datetime-local" id="time" name="time" value={state.formData.time} onChange={e => updateState({ formData: {...state.formData, time: e.target.value} })} className="w-full input-style" required/>
                    </div>
                    <div>
                        <label htmlFor="end_time" className="block text-sm font-medium mb-1">Slut tidspunkt (valgfrit)</label>
                        <input type="datetime-local" id="end_time" name="end_time" value={state.formData.end_time} onChange={e => updateState({ formData: {...state.formData, end_time: e.target.value} })} className="w-full input-style"/>
                    </div>
                </div>
                 <div>
                    <label htmlFor="address" className="block text-sm font-medium mb-1">Adresse</label>
                    <input type="text" id="address" name="address" value={state.formData.address} onChange={e => updateState({ formData: {...state.formData, address: e.target.value} })} className="w-full input-style" placeholder="F.eks. Gade 123, 9000 Aalborg" />
                </div>
                <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-full text-lg">Opret Event</button>
            </form>
        );
    };

    if (pageLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline-block" /></div>;

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Importer Event med AI</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Spar tid ved at lade vores AI oprette dine events for dig.</p>
            <style>{`.input-style { display: block; width: 100%; padding: 0.75rem 1rem; color: #212529; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.5rem; outline: none; } .dark .input-style { background-color: #2a3343; border-color: #3c465b; color: #e2e8f0; } .input-style:focus { --tw-ring-color: #006B76; border-color: #006B76; box-shadow: 0 0 0 2px var(--tw-ring-color); }`}</style>

            <div className="max-w-2xl mx-auto bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                {error && <p className="text-red-500 text-center bg-red-100 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</p>}
                {state.mode === 'choice' ? renderChoice() : <button onClick={handleReset} className="text-sm font-semibold text-primary mb-4 flex items-center"><ArrowLeft size={16} className="mr-1"/> Tilbage</button>}
                {state.mode === 'single' && state.step === 'input' && renderSingleInput()}
                {state.mode === 'batch' && state.step === 'input' && renderBatchInput()}
                {state.step === 'loading' && <div className="flex flex-col items-center justify-center p-8 space-y-3"><Loader2 className="animate-spin text-primary" size={48} /><p className="font-semibold">{importStatus || 'Arbejder...'}</p></div>}
                {state.step === 'form' && renderForm()}
                {state.step === 'review' && renderReview()}
            </div>
            {state.dateTimeOptions.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg p-6 w-full max-w-sm"><h3 className="font-bold mb-4">Vælg det korrekte tidspunkt</h3><div className="space-y-2">{state.dateTimeOptions.map(dt => <button key={dt} onClick={() => processImportedData({...state.pendingImportData!, datetime: dt})} className="w-full text-left p-2 rounded hover:bg-gray-100">{new Date(dt).toLocaleString('da-DK')}</button>)}</div></div></div>
            )}
        </div>
    );
};

export default ImportEventPage;
