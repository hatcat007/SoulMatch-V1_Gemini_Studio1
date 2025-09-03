import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { generateEventImageFromText, importEventFromText } from '../../services/geminiService';
import { uploadBase64File, fetchPrivateFile } from '../../services/s3Service';
import type { Organization } from '../../types';
import { Sparkles, Loader2, ArrowLeft, Image as ImageIcon, X, Camera, Palette, XCircle } from 'lucide-react';

const emojiOptions = ['🎉', '🍔', '🎨', '🎲', '🎬', '🚶‍♀️', '🎮', '💪', '🥳', '☕', '🎸', '🍽️'];
const categoryOptions = ['Mad', 'Events', 'Kultur', 'Brætspil', 'Biograf', 'Gåtur', 'Gaming', 'Træning', 'Fest', 'Musik'];
const colorOptions = ['bg-blue-100', 'bg-red-100', 'bg-green-100', 'bg-yellow-100', 'bg-indigo-100', 'bg-pink-100', 'bg-teal-100', 'bg-orange-100', 'bg-cyan-100'];

const emojiMenuOptions: { level: 'ai' | 'none' | 'some' | 'many'; label: string }[] = [
    { level: 'ai', label: 'Lad AI beslutte' },
    { level: 'none', label: 'Ingen emojis' },
    { level: 'some', label: 'En smule' },
    { level: 'many', label: 'Mange' },
];

const PrivateImage: React.FC<{src: string, onRemove: () => void}> = ({ src, onRemove }) => {
    const [imageUrl, setImageUrl] = useState<string>('');

    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            fetchPrivateFile(src).then(url => {
                objectUrl = url;
                setImageUrl(url);
            });
        }
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    if (!imageUrl) return <div className="aspect-video bg-gray-200 animate-pulse rounded-lg" />;
    return (
        <div className="relative aspect-video">
            <img src={imageUrl} alt="AI generated for event" className="w-full h-full object-cover rounded-lg"/>
            <button type="button" onClick={onRemove} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75"><X size={16}/></button>
        </div>
    );
};

const ImportEventPage: React.FC = () => {
    const navigate = useNavigate();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    
    const [eventText, setEventText] = useState('');
    const [step, setStep] = useState<'input' | 'loading' | 'form'>('input');
    const [error, setError] = useState<string | null>(null);
    const [dateTimeWarning, setDateTimeWarning] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState('');
    const [imageGenerationStyle, setImageGenerationStyle] = useState<'none' | 'realistic' | 'illustration'>('realistic');
    const [includeTitleOnImage, setIncludeTitleOnImage] = useState(true);
    const [emojiLevel, setEmojiLevel] = useState<'ai' | 'none' | 'some' | 'many'>('ai');
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        time: '',
        category: '',
        emoji: '🎉',
        color: 'bg-blue-100',
        image_url: '',
    });

    useEffect(() => {
        const hasSeenGuide = localStorage.getItem('hasSeenImportEventGuide');
        if (!hasSeenGuide) {
            setShowWelcomeModal(true);
        }

        const fetchOrg = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: orgData } = await supabase.from('organizations').select('*').eq('auth_id', user.id).single();
                setOrganization(orgData);
            }
            setPageLoading(false);
        };
        fetchOrg();
    }, []);
    
    const handleCloseWelcomeModal = () => {
        localStorage.setItem('hasSeenImportEventGuide', 'true');
        setShowWelcomeModal(false);
    };

    const handleImport = async () => {
        if (!eventText.trim()) {
            setError('Indsæt venligst tekst fra eventsiden.');
            return;
        }
        setStep('loading');
        setError(null);
        setDateTimeWarning(null);

        try {
            setImportStatus('Analyserer tekst...');
            const importedData = await importEventFromText(eventText, categoryOptions, emojiOptions, emojiLevel);
            if (importedData.error) {
                throw new Error(importedData.error);
            }
            
            if (!importedData.datetime) {
                setDateTimeWarning("AI kunne ikke finde en specifik dato og tid. Indtast venligst manuelt.");
            }

            let imageUrl = '';
            if (imageGenerationStyle !== 'none') {
                setImportStatus('Genererer billede (kan tage et øjeblik)...');
                const base64Image = await generateEventImageFromText(
                    importedData.description,
                    imageGenerationStyle,
                    importedData.title,
                    includeTitleOnImage
                );
                
                setImportStatus('Uploader billede...');
                imageUrl = await uploadBase64File(base64Image, importedData.title || 'event-image');
            }
            
            setFormData(prev => ({
                ...prev,
                title: importedData.title || '',
                description: importedData.description || '',
                time: importedData.datetime || '',
                category: importedData.category || '',
                emoji: importedData.emoji || '🎉',
                image_url: imageUrl,
            }));
            setStep('form');
        } catch (err: any) {
            setError(`Fejl ved import: ${err.message}`);
            setStep('input');
        } finally {
            setImportStatus('');
        }
    };
    
    const handleReset = () => {
        setEventText('');
        setFormData({ title: '', description: '', time: '', category: '', emoji: '🎉', color: 'bg-blue-100', image_url: '' });
        setError(null);
        setDateTimeWarning(null);
        setImageGenerationStyle('realistic');
        setIncludeTitleOnImage(true);
        setEmojiLevel('ai');
        setStep('input');
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) {
            setError("Organisation data ikke indlæst. Kan ikke oprette event.");
            return;
        }
        setStep('loading');
        setError(null);
        
        const { error: insertError } = await supabase.from('events').insert({
            title: formData.title,
            description: formData.description,
            time: formData.time,
            category: formData.category,
            icon: formData.emoji,
            color: formData.color,
            image_url: formData.image_url,
            organization_id: organization.id,
            host_name: organization.name,
            host_avatar_url: organization.logo_url,
        });

        if (insertError) {
            setError(insertError.message);
            setStep('form');
        } else {
            navigate('/dashboard');
        }
    };

    if (pageLoading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            {showWelcomeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={handleCloseWelcomeModal}>
                    <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-center text-text-primary dark:text-dark-text-primary mb-4">Sådan fungerer "Importer Event med AI" 🤖</h3>
                        <div className="text-text-secondary dark:text-dark-text-secondary space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            <p><strong>📋 Kopier Tekst:</strong> Find et event, du vil oprette (f.eks. på Facebook, en hjemmeside eller i en e-mail). Kopier al teksten, der beskriver eventet.</p>
                            <p><strong>✍️ Sæt Tekst Ind:</strong> Indsæt den kopierede tekst i det store tekstfelt.</p>
                            <p><strong>✨ AI-Analyse:</strong> Systemets kunstige intelligens (AI) læser og forstår automatisk teksten. Den finder selv ud af, hvad der er titlen, beskrivelsen, datoen, tidspunktet og stedet for eventet.</p>
                            <p><strong>😄 Vælg Emojis:</strong> Bestem, hvordan beskrivelsen skal se ud. Du kan lade AI'en vælge emojis for dig, eller du kan vælge "ingen", "en smule" eller "mange" emojis.</p>
                            <p><strong>🖼️ Generer et Billede:</strong> Få AI'en til at lave et unikt billede til dit event.</p>
                            <ul className="list-disc list-inside ml-4 text-sm space-y-1">
                                <li><strong>📸 Realistisk Foto:</strong> Et billede, der ligner et rigtigt fotografi.</li>
                                <li><strong>🎨 2D Illustration:</strong> En tegnet illustration.</li>
                                <li><strong>❌ Intet Billede:</strong> Hvis du ikke ønsker et billede.</li>
                                <li>Du kan også vælge, om eventets titel skal stå på billedet.</li>
                            </ul>
                            <p><strong>🚀 Importér & Færdig:</strong> Tryk på knappen "Import med AI". Nu bliver dit event oprettet automatisk med alle detaljerne udfyldt for dig. Det sparer dig for en masse tid og HELT GRATIS.</p>
                        </div>
                        <div className="mt-6 text-center">
                            <button
                                onClick={handleCloseWelcomeModal}
                                className="bg-primary text-white font-bold py-2 px-8 rounded-full text-lg hover:bg-primary-dark transition duration-300"
                            >
                                Forstået!
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Importer Event med AI</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Kopier teksten fra en event-side (f.eks. Facebook). Vores AI vil analysere den og udfylde detaljerne for dig.</p>
            <style>{`.toggle-checkbox:checked { right: 0; border-color: #006B76; } .toggle-checkbox:checked + .toggle-label { background-color: #006B76; } .input-style { display: block; width: 100%; padding: 0.75rem 1rem; color: #212529; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.5rem; outline: none; } .dark .input-style { background-color: #2a3343; border-color: #3c465b; color: #e2e8f0; } .input-style:focus { --tw-ring-color: #006B76; border-color: #006B76; box-shadow: 0 0 0 2px var(--tw-ring-color); }`}</style>

            <div className="max-w-2xl mx-auto bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm">
                {error && <p className="text-red-500 text-center bg-red-100 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</p>}
                
                {step === 'loading' && (
                    <div className="flex flex-col items-center justify-center p-8 space-y-3">
                        <Loader2 className="animate-spin text-primary" size={48} />
                        <p className="font-semibold text-text-primary dark:text-dark-text-primary">{importStatus || 'Arbejder...'}</p>
                        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Dette kan tage et øjeblik.</p>
                    </div>
                )}

                {step === 'input' && (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="eventText" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Indsæt tekst fra event-side</label>
                            <textarea
                                id="eventText" value={eventText} onChange={e => setEventText(e.target.value)}
                                rows={8}
                                className="w-full input-style"
                                placeholder="Indsæt event titel, beskrivelse, dato, tid, sted her..."
                            />
                        </div>
                         <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Emojis i beskrivelse</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {emojiMenuOptions.map(option => (
                                    <button
                                        key={option.level}
                                        type="button"
                                        onClick={() => setEmojiLevel(option.level)}
                                        className={`text-center p-3 rounded-lg border-2 transition-colors text-sm font-semibold ${emojiLevel === option.level ? 'border-primary bg-primary-light dark:bg-primary/20' : 'border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface-light hover:border-gray-400'}`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Generer billede til eventet</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setImageGenerationStyle('realistic')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${imageGenerationStyle === 'realistic' ? 'border-primary bg-primary-light dark:bg-primary/20' : 'border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface-light hover:border-gray-400'}`}
                                >
                                    <Camera size={24} className="mb-1 text-primary"/>
                                    <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Realistisk Foto</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageGenerationStyle('illustration')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${imageGenerationStyle === 'illustration' ? 'border-primary bg-primary-light dark:bg-primary/20' : 'border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface-light hover:border-gray-400'}`}
                                >
                                    <Palette size={24} className="mb-1 text-primary"/>
                                    <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">2D Illustration</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageGenerationStyle('none')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${imageGenerationStyle === 'none' ? 'border-gray-500 bg-gray-200 dark:bg-dark-border' : 'border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface-light hover:border-gray-400'}`}
                                >
                                    <XCircle size={24} className="mb-1 text-gray-500"/>
                                    <span className="text-sm font-semibold text-text-secondary dark:text-dark-text-secondary">Intet billede</span>
                                </button>
                            </div>
                            {imageGenerationStyle !== 'none' && (
                                <div className="mt-4">
                                    <label
                                        htmlFor="includeTitleToggle"
                                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                                    >
                                        <span className="font-medium text-sm text-gray-700 dark:text-dark-text-secondary">
                                            Inkluder titel på billedet
                                        </span>
                                        <div className="relative inline-block w-10 flex-shrink-0 align-middle select-none">
                                            <input
                                                type="checkbox"
                                                id="includeTitleToggle"
                                                checked={includeTitleOnImage}
                                                onChange={(e) => setIncludeTitleOnImage(e.target.checked)}
                                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                            />
                                            <label
                                                htmlFor="includeTitleToggle"
                                                className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                                            ></label>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleImport}
                            className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-md flex items-center justify-center"
                        >
                            <Sparkles size={20} className="mr-2" />
                            Import med AI
                        </button>
                    </div>
                )}

                {step === 'form' && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                         <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Bekræft Event Detaljer</h2>
                            <button type="button" onClick={handleReset} className="flex items-center text-sm font-semibold text-primary hover:underline">
                                <ArrowLeft size={16} className="mr-1" /> Start forfra
                            </button>
                        </div>
                        
                        {formData.image_url && (
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">AI-genereret billede</label>
                                <PrivateImage src={formData.image_url} onRemove={() => setFormData(p => ({...p, image_url: ''}))} />
                            </div>
                        )}

                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Navn på event</label>
                            <input type="text" id="title" name="title" value={formData.title} onChange={handleFormChange} className="w-full input-style" required />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Beskrivelse</label>
                            <textarea id="description" name="description" rows={5} value={formData.description} onChange={handleFormChange} className="w-full input-style" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Tidspunkt</label>
                                {dateTimeWarning && (
                                    <p className="text-sm text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 p-2 rounded-md mb-2">{dateTimeWarning}</p>
                                )}
                                <input type="datetime-local" id="time" name="time" value={formData.time} onChange={handleFormChange} className="w-full input-style" required/>
                            </div>
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Kategori</label>
                                <select id="category" name="category" value={formData.category} onChange={handleFormChange} className="w-full input-style" required>
                                   <option value="" disabled>Vælg en kategori</option>
                                   {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Ikon (emoji)</label>
                            <div className="flex items-center space-x-4">
                                <div className="text-5xl p-2 bg-gray-100 dark:bg-dark-surface-light rounded-lg">{formData.emoji}</div>
                                <div className="grid grid-cols-6 gap-2 flex-1">
                                    {emojiOptions.map(e => (
                                        <button key={e} type="button" onClick={() => setFormData(prev => ({...prev, emoji: e}))} className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${formData.emoji === e ? 'bg-primary-light dark:bg-primary/20 scale-110' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-light'}`}>
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Kort farve</label>
                            <div className="flex flex-wrap gap-2">
                                {colorOptions.map(c => (
                                    <button key={c} type="button" onClick={() => setFormData(prev => ({...prev, color: c}))} className={`w-10 h-10 rounded-full ${c} border-2 ${formData.color === c ? 'border-primary' : 'border-transparent'}`}></button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg">
                            Opret Event
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ImportEventPage;