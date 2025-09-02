import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Utensils, Dice5, MessagesSquare, Music, Paintbrush, Footprints } from 'lucide-react';

interface ConfirmOrganizationPageProps {
  onConfirm: () => void;
}

const initialData = {
  name: 'SIND Ungdom Aalborg',
  phone: '+45 2323112',
  type: 'NGO forening',
  facebookLink: 'Facebook.com/sindungdomaalborg',
  description: 'SIND Ungdom i Aalborg er et klubtilbud for unge psykisk sårbare i alderen 16-35 år.',
  logo: 'https://i.imgur.com/8S8V5c2.png',
};

const emojiChoices = [
    { name: 'Fællesspisning', icon: Utensils },
    { name: 'Brætspil', icon: Dice5 },
    { name: 'Fælles snak', icon: MessagesSquare },
    { name: 'Musik', icon: Music },
    { name: 'Kreativt', icon: Paintbrush },
    { name: 'Gåtur', icon: Footprints },
];


const ConfirmOrganizationPage: React.FC<ConfirmOrganizationPageProps> = ({ onConfirm }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialData);
  const [selectedEmojis] = useState<string[]>(['Fællesspisning', 'Brætspil', 'Fælles snak']);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
            setFormData(prev => ({...prev, logo: event.target?.result as string }));
        };
        reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Final data:', { ...formData, emojis: selectedEmojis });
    onConfirm();
  };
  
  const displayedEmojis = emojiChoices.filter(emoji => selectedEmojis.includes(emoji.name));
  
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-dark-background">
        <header className="flex-shrink-0 flex items-center p-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
                <ArrowLeft size={28} />
            </button>
            <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mx-auto">Min side</h1>
            <div className="w-11 h-11" /> {/* Spacer for centering */}
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-4">
            <p className="text-center text-text-secondary dark:text-dark-text-secondary mb-6">
                Vi har automatisk indhentet oplysninger fra jeres Facebook side. Ret endelig gerne til med flere oplysninger og emojis 😊
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center space-x-4">
                    <div className="relative flex-shrink-0">
                        <img src={formData.logo} alt="Organization logo" className="w-20 h-20 object-contain p-1 border rounded-md bg-white" />
                         <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 bg-gray-800 text-white p-1.5 rounded-full border-2 border-white dark:border-gray-50"
                         >
                            <Camera size={16} />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                    </div>
                    <div className="flex-1">
                        <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Navn</label>
                        <input
                            type="text" id="name" name="name"
                            value={formData.name} onChange={handleInputChange}
                            className="w-full px-4 py-2 mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Telefon</label>
                        <input
                            type="tel" id="phone" name="phone"
                            value={formData.phone} onChange={handleInputChange}
                            className="w-full px-4 py-2 mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                     <div>
                        <label htmlFor="type" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Type</label>
                        <input
                            type="text" id="type" name="type"
                            value={formData.type} onChange={handleInputChange}
                            className="w-full px-4 py-2 mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="facebookLink" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Facebook side link</label>
                    <input
                        type="text" id="facebookLink" name="facebookLink"
                        value={formData.facebookLink} onChange={handleInputChange}
                        className="w-full px-4 py-2 mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                
                 <div>
                    <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Kort beskrivelse</label>
                    <textarea
                        id="description" name="description" rows={4}
                        value={formData.description} onChange={handleInputChange}
                        className="w-full px-4 py-2 mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                
                <div>
                    <h3 className="text-center font-semibold text-text-primary dark:text-dark-text-primary mt-6 mb-4">Vælg 3 emojis som beskriver jer</h3>
                     <div className="grid grid-cols-3 gap-4">
                        {displayedEmojis.map(emoji => {
                           const Icon = emoji.icon;
                           return (
                             <div key={emoji.name} className="flex flex-col items-center p-2 border-b-2 border-gray-300 dark:border-dark-border">
                               <div className="w-16 h-16 rounded-full bg-primary-dark/90 text-white flex items-center justify-center mb-2">
                                   <Icon size={32} />
                               </div>
                               <p className="text-sm font-semibold text-text-secondary dark:text-dark-text-secondary text-center">{emoji.name}</p>
                            </div>
                           )
                        })}
                        {Array.from({ length: 3 - displayedEmojis.length }).map((_, i) => (
                             <div key={`placeholder-${i}`} className="flex flex-col items-center p-2">
                               <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-dark-surface-light mb-2"></div>
                               <p className="text-sm font-semibold text-transparent">-</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sticky bottom-0 bg-gray-50 dark:bg-dark-background pt-4">
                    <p className="text-center text-sm text-text-secondary dark:text-dark-text-secondary mb-2">Er dette korrekt?</p>
                    <button
                      type="submit"
                      className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
                    >
                      Godkend
                    </button>
                </div>
            </form>
        </main>
    </div>
  );
};

export default ConfirmOrganizationPage;
