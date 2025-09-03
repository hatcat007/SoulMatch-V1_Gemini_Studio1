

import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Camera, Utensils, Dice5, MessagesSquare, Music, Paintbrush, Footprints, 
    Coffee, BookOpen, Film, Gamepad2, Bike, Mountain, Heart, Users, Sprout, 
    GraduationCap, Mic, Palette, Drama, Church, Handshake, Leaf, Dumbbell, Cake, HelpingHand, Building
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { uploadFile } from '../services/s3Service';

const prefilledData = {
  name: 'SIND Ungdom Aalborg',
  phone: '+45 2323112',
  type: 'NGO forening',
  facebookLink: 'Facebook.com/sindungdomaalborg',
  description: 'SIND Ungdom i Aalborg er et klubtilbud for unge psykisk sårbare i alderen 16-35 år.',
  logo: 'https://i.imgur.com/8S8V5c2.png',
};

const emptyData = {
  name: '',
  phone: '',
  type: '',
  facebookLink: '',
  description: '',
  logo: '',
};

const emojiChoices = [
    { name: 'Fællesspisning', icon: Utensils },
    { name: 'Brætspil', icon: Dice5 },
    { name: 'Fælles snak', icon: MessagesSquare },
    { name: 'Musik', icon: Music },
    { name: 'Kreativt', icon: Paintbrush },
    { name: 'Gåtur', icon: Footprints },
    { name: 'Kaffehygge', icon: Coffee },
    { name: 'Læseklub', icon: BookOpen },
    { name: 'Film aften', icon: Film },
    { name: 'Gaming', icon: Gamepad2 },
    { name: 'Cykelture', icon: Bike },
    { name: 'Udflugter', icon: Mountain },
    { name: 'Støttegruppe', icon: Heart },
    { name: 'Netværk', icon: Users },
    { name: 'Frivillighed', icon: Sprout },
    { name: 'Workshops', icon: GraduationCap },
    { name: 'Foredrag', icon: Mic },
    { name: 'Kunst', icon: Palette },
    { name: 'Teater', icon: Drama },
    { name: 'Spirituelt', icon: Church },
    { name: 'Velgørenhed', icon: Handshake },
    { name: 'Natur', icon: Leaf },
    { name: 'Sport', icon: Dumbbell },
    { name: 'Socialt', icon: Cake },
    { name: 'Hjælp', icon: HelpingHand },
];

const INITIAL_EMOJI_COUNT = 5;

const ConfirmOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isManual = !!location.state?.manual;

  const [formData, setFormData] = useState(isManual ? emptyData : prefilledData);
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>(isManual ? [] : ['Fællesspisning', 'Brætspil', 'Fælles snak']);
  const [visibleEmojiCount, setVisibleEmojiCount] = useState(INITIAL_EMOJI_COUNT);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setLoading(true);
        try {
            const imageUrl = await uploadFile(file);
            setFormData(prev => ({ ...prev, logo: imageUrl }));
        } catch (err) {
            setError('Logo upload failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }
  };

  const handleEmojiSelect = (emojiName: string) => {
    if (selectedEmojis.includes(emojiName)) {
        setSelectedEmojis(prev => prev.filter(name => name !== emojiName));
    } else if (selectedEmojis.length < 3) {
        setSelectedEmojis(prev => [...prev, emojiName]);
    }
  };

  const showMoreEmojis = () => {
    setVisibleEmojiCount(prev => Math.min(prev + 10, emojiChoices.length));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
     if (!email || !password) {
        setError("Email and password are required to create an account.");
        return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: formData.name,
                is_organization: true,
            }
        }
    });

    if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
    }

    if (data.user && data.user.identities?.length === 0) {
        setMessage('User with this email already exists. Please log in.');
        setLoading(false);
        return;
    }

    if (data.user) {
        const { error: rpcError } = await supabase.rpc('create_organization_profile', {
            auth_id: data.user.id,
            name: formData.name,
            phone: formData.phone,
            description: formData.description,
            logo_url: formData.logo
        });

        if (rpcError) {
            setError(`Account created, but failed to save organization profile: ${rpcError.message}`);
            setLoading(false);
            return;
        }
    }
    
    // If email verification is disabled, user is logged in.
    // Give a more appropriate message.
    if (data.session) {
        setMessage('Success! Your organization profile has been created. You will be logged in shortly.');
         setTimeout(() => {
            // The App.tsx listener will handle the redirect, but we can force it
             window.location.hash = '/dashboard';
             window.location.reload(); // Force a refresh to re-evaluate auth state
        }, 2000);
    } else {
        setMessage('Tjek din email for at bekræfte din organisations konto.');
    }

    setLoading(false);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-background">
        <header className="flex-shrink-0 flex items-center p-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
                <ArrowLeft size={28} />
            </button>
            <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mx-auto">Bekræft Oplysninger</h1>
            <div className="w-11 h-11" /> {/* Spacer for centering */}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
             <div className="max-w-3xl mx-auto">
                <p className="text-center text-text-secondary dark:text-dark-text-secondary mb-6">
                    {isManual
                        ? 'Udfyld venligst oplysningerne for at oprette jeres profil.'
                        : 'Vi har automatisk indhentet oplysninger fra jeres Facebook side. Ret endelig gerne til med flere oplysninger og emojis 😊'}
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-dark-surface p-6 md:p-8 rounded-2xl shadow-lg">
                    {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}
                    {message && <p className="text-green-500 text-center text-sm mb-4">{message}</p>}
                    
                    <div className="flex flex-col sm:flex-row items-center sm:space-x-6">
                        <div className="relative flex-shrink-0 mb-4 sm:mb-0">
                            <div className="w-24 h-24 border rounded-xl bg-gray-50 dark:bg-dark-surface-light flex items-center justify-center">
                                {formData.logo ? (
                                    <img src={formData.logo} alt="Organization logo" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <Building size={48} className="text-gray-400 dark:text-gray-500" />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full border-4 border-white dark:border-dark-surface"
                                aria-label="Upload new logo"
                            >
                                <Camera size={18} />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                        </div>
                        <div className="flex-1 w-full">
                            <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Navn på organisation</label>
                            <input
                                type="text" id="name" name="name"
                                value={formData.name} onChange={handleInputChange}
                                className="w-full px-4 py-2 mt-1 bg-gray-50 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Telefon</label>
                            <input
                                type="tel" id="phone" name="phone"
                                value={formData.phone} onChange={handleInputChange}
                                className="w-full px-4 py-2 mt-1 bg-gray-50 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label htmlFor="type" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Type</label>
                            <input
                                type="text" id="type" name="type"
                                value={formData.type} onChange={handleInputChange}
                                className="w-full px-4 py-2 mt-1 bg-gray-50 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="facebookLink" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Facebook side link</label>
                        <input
                            type="text" id="facebookLink" name="facebookLink"
                            value={formData.facebookLink} onChange={handleInputChange}
                            className="w-full px-4 py-2 mt-1 bg-gray-50 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Kort beskrivelse</label>
                        <textarea
                            id="description" name="description" rows={4}
                            value={formData.description} onChange={handleInputChange}
                            className="w-full px-4 py-2 mt-1 bg-gray-50 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    
                    <hr className="my-6 border-gray-200 dark:border-dark-border"/>
                    
                    <h3 className="text-lg font-semibold text-center text-text-primary dark:text-dark-text-primary">Opret Jeres Konto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Konto Email</label>
                            <input
                                type="email" id="email" name="email"
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 mt-1 bg-gray-50 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="organisation@email.com" required
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Konto Adgangskode</label>
                            <input
                                type="password" id="password" name="password"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 mt-1 bg-gray-50 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Vælg en sikker adgangskode" required
                            />
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold text-center text-text-primary dark:text-dark-text-primary mt-6 mb-4">Vælg 3 emojis som beskriver jer</h3>
                        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                           {emojiChoices.slice(0, visibleEmojiCount).map(emoji => {
                                const Icon = emoji.icon;
                                const isSelected = selectedEmojis.includes(emoji.name);
                                return (
                                    <button
                                        type="button"
                                        key={emoji.name}
                                        onClick={() => handleEmojiSelect(emoji.name)}
                                        className="flex flex-col items-center text-center w-24 transition-transform duration-200 transform hover:scale-105"
                                    >
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 transition-colors ${isSelected ? 'bg-primary-dark/90 text-white' : 'bg-primary-light dark:bg-dark-surface-light text-primary-dark dark:text-dark-text-primary'}`}>
                                            <Icon size={36} />
                                        </div>
                                        <p className="text-sm font-semibold text-text-secondary dark:text-dark-text-secondary">{emoji.name}</p>
                                    </button>
                                );
                            })}
                        </div>
                        {visibleEmojiCount < emojiChoices.length && (
                            <div className="text-center mt-6">
                                <button
                                    type="button"
                                    onClick={showMoreEmojis}
                                    className="bg-primary-light text-primary font-bold py-2 px-6 rounded-full hover:bg-primary/20 transition dark:bg-dark-surface-light dark:text-dark-text-primary dark:hover:bg-dark-border"
                                >
                                    Flere
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50"
                        >
                        {loading ? 'Godkender...' : 'Godkend og opret konto'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    </div>
  );
};

export default ConfirmOrganizationPage;