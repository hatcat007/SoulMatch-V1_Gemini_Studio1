import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Camera, Utensils, Dice5, MessagesSquare, Music, Paintbrush, Footprints, 
    Coffee, BookOpen, Film, Gamepad2, Bike, Mountain, Heart, Users, Sprout, 
    GraduationCap, Mic, Palette, Drama, Church, Handshake, Leaf, Dumbbell, Cake, HelpingHand, Building, Loader2
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { uploadFile, fetchPrivateFile } from '../services/s3Service';

const prefilledData = {
  name: 'SIND Ungdom Aalborg',
  phone: '+45 2323112',
  website: 'sindungdom.dk',
  address: 'Danmarksgade 52, 9000 Aalborg',
  organization_type: 'NGO forening',
  facebook_url: 'Facebook.com/sindungdomaalborg',
  description: 'SIND Ungdom i Aalborg er et klubtilbud for unge psykisk sårbare i alderen 16-35 år.',
  logo_url: 'https://i.imgur.com/8S8V5c2.png',
  host_name: 'Jette Jensen',
};

const emptyData = {
  name: '',
  phone: '',
  website: '',
  address: '',
  organization_type: '',
  facebook_url: '',
  description: '',
  logo_url: '',
  host_name: '',
};

const emojiChoices = [
    { name: 'Fællesspisning', icon: Utensils }, { name: 'Brætspil', icon: Dice5 }, { name: 'Fælles snak', icon: MessagesSquare },
    { name: 'Musik', icon: Music }, { name: 'Kreativt', icon: Paintbrush }, { name: 'Gåtur', icon: Footprints },
    { name: 'Kaffehygge', icon: Coffee }, { name: 'Læseklub', icon: BookOpen }, { name: 'Film aften', icon: Film },
    { name: 'Gaming', icon: Gamepad2 }, { name: 'Cykelture', icon: Bike }, { name: 'Udflugter', icon: Mountain },
    { name: 'Støttegruppe', icon: Heart }, { name: 'Netværk', icon: Users }, { name: 'Frivillighed', icon: Sprout },
    { name: 'Workshops', icon: GraduationCap }, { name: 'Foredrag', icon: Mic }, { name: 'Kunst', icon: Palette },
    { name: 'Teater', icon: Drama }, { name: 'Spirituelt', icon: Church }, { name: 'Velgørenhed', icon: Handshake },
    { name: 'Natur', icon: Leaf }, { name: 'Sport', icon: Dumbbell }, { name: 'Socialt', icon: Cake }, { name: 'Hjælp', icon: HelpingHand },
];

const SmartImage: React.FC<{ src: string; alt: string; className: string; fallback: React.ReactNode; }> = ({ src, alt, className, fallback }) => {
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

    if (isLoading) return <div className={`${className} flex items-center justify-center`}><Loader2 className="animate-spin text-gray-400" /></div>;
    if (!displayUrl) return <div className={className}>{fallback}</div>;
    return <img src={displayUrl} alt={alt} className={className} />;
};


const ConfirmOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isManual = !!location.state?.manual;

  const [formData, setFormData] = useState(isManual ? emptyData : prefilledData);
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>(isManual ? [] : ['Fællesspisning', 'Brætspil', 'Fælles snak']);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const hostAvatarInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url') => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const previewUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, [field]: previewUrl })); // Show preview immediately
        
        try {
            const finalUrl = await uploadFile(file);
            setFormData(prev => ({ ...prev, [field]: finalUrl }));
        } catch (err) {
            setError('Image upload failed. Please try again.');
            setFormData(prev => ({ ...prev, [field]: '' })); // Clear on error
        } finally {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        }
    }
  };

  const handleEmojiSelect = (emojiName: string) => {
    setSelectedEmojis(prev => 
        prev.includes(emojiName) ? prev.filter(name => name !== emojiName) : (prev.length < 3 ? [...prev, emojiName] : prev)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: formData.name, is_organization: true } }
    });

    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    if (signUpData.user && signUpData.user.identities?.length === 0) { setMessage('User exists. Please log in.'); setLoading(false); return; }

    if (signUpData.user) {
        const { error: updateError } = await supabase.from('organizations').update({
            ...formData,
            emojis: selectedEmojis,
        }).eq('auth_id', signUpData.user.id);

        if (updateError) {
            setError(`Account created, but failed to update profile: ${updateError.message}`);
            setLoading(false);
            return;
        }
    }
    
    if (signUpData.session) {
        setMessage('Success! Profile created. Logging you in...');
        setTimeout(() => { window.location.hash = '/dashboard'; window.location.reload(); }, 2000);
    } else {
        setMessage('Check your email to confirm your organization account.');
    }
    setLoading(false);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-background">
        <header className="flex-shrink-0 flex items-center justify-between p-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary"><ArrowLeft size={28} /></button>
            <h1 className="text-2xl font-bold text-primary">Bekræft Oplysninger</h1>
            <div className="w-8"></div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md space-y-6">
                <h2 className="text-2xl font-bold text-center text-text-primary dark:text-dark-text-primary">Opret Organisationsprofil</h2>
                <p className="text-center text-text-secondary dark:text-dark-text-secondary">
                    {isManual ? "Udfyld venligst oplysningerne manuelt." : "Bekræft venligst de indhentede oplysninger fra Facebook."}
                </p>

                {/* Profile and Host Section */}
                <div className="flex flex-col items-center border-b pb-6 dark:border-dark-border">
                    <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-dark-surface-light flex items-center justify-center mb-2 overflow-hidden border">
                        <SmartImage src={formData.logo_url} alt="Organization logo" className="w-full h-full object-cover" fallback={<Building size={48} className="text-gray-400" />} />
                    </div>
                    <input type="file" ref={logoInputRef} onChange={(e) => handleImageUpload(e, 'logo_url')} accept="image/*" className="hidden" />
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="text-sm font-semibold text-primary hover:underline"><Camera size={16} className="inline mr-1" /> Skift logo</button>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="name" placeholder="Navn på organisation" value={formData.name} onChange={handleInputChange} className="input-style" required />
                    <input name="organization_type" placeholder="Type (f.eks. NGO, Café)" value={formData.organization_type} onChange={handleInputChange} className="input-style" />
                    <input name="host_name" placeholder="Værtens navn" value={formData.host_name} onChange={handleInputChange} className="input-style" />
                    <input name="phone" placeholder="Telefonnummer" value={formData.phone} onChange={handleInputChange} className="input-style" />
                    <input name="address" placeholder="Adresse" value={formData.address} onChange={handleInputChange} className="input-style" />
                    <input name="website" placeholder="Hjemmeside" value={formData.website} onChange={handleInputChange} className="input-style" />
                    <input name="facebook_url" placeholder="Facebook URL" value={formData.facebook_url} onChange={handleInputChange} className="input-style" />
                </div>
                <textarea name="description" placeholder="Beskrivelse" rows={4} value={formData.description} onChange={handleInputChange} className="input-style w-full" required></textarea>

                {/* Emojis */}
                <div>
                    <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-2">Vælg op til 3 aktiviteter, I tilbyder</h3>
                    <div className="flex flex-wrap gap-2">
                        {emojiChoices.map(emoji => (
                            <button type="button" key={emoji.name} onClick={() => handleEmojiSelect(emoji.name)}
                                className={`flex items-center px-3 py-2 rounded-full text-sm border-2 transition ${selectedEmojis.includes(emoji.name) ? 'bg-primary-light dark:bg-primary/20 border-primary' : 'bg-gray-100 dark:bg-dark-surface-light border-transparent'}`}>
                                <emoji.icon size={16} className="mr-2" />
                                {emoji.name}
                            </button>
                        ))}
                    </div>
                </div>
                <style>{`.input-style { display: block; width: 100%; padding: 0.75rem 1rem; color: #212529; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.5rem; } .dark .input-style { background-color: #2a3343; border-color: #3c465b; color: #e2e8f0; }`}</style>

                <hr className="dark:border-dark-border" />
                <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Opret administrator-konto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} className="input-style" required />
                    <input type="password" placeholder="Admin Adgangskode" value={password} onChange={e => setPassword(e.target.value)} className="input-style" required />
                </div>

                {error && <p className="text-red-500 text-center bg-red-100 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm">{error}</p>}
                {message && <p className="text-green-500 text-center bg-green-100 dark:bg-green-900/20 dark:text-green-400 p-3 rounded-lg text-sm">{message}</p>}

                <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50">
                    {loading ? 'Opretter...' : 'Opret og fortsæt'}
                </button>
            </form>
        </main>
    </div>
  );
};

export default ConfirmOrganizationPage;