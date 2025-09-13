import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActivityIcon {
    id: number;
    name: string;
    icon: string;
}

const durationOptions = [
    { label: '1 Time', hours: 1 },
    { label: '2 Timer', hours: 2 },
    { label: '3 Timer', hours: 3 },
];

const CreateDropInPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [locationName, setLocationName] = useState('');
    const [durationHours, setDurationHours] = useState(1);
    const [activityIcons, setActivityIcons] = useState<ActivityIcon[]>([]);
    const [iconsLoading, setIconsLoading] = useState(true);
    const [activityIcon, setActivityIcon] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchIcons = async () => {
            setIconsLoading(true);
            const { data, error } = await supabase
                .from('drop_in_activity_icons')
                .select('id, name, icon')
                .order('id');
            
            if (error) {
                console.error("Error fetching activity icons:", error);
                setError("Kunne ikke hente aktivitetsikoner. Prøv igen senere.");
            } else if (data && data.length > 0) {
                setActivityIcons(data);
                setActivityIcon(data[0].icon);
            }
            setIconsLoading(false);
        };
        fetchIcons();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError("Du skal være logget ind for at oprette et drop-in.");
            return;
        }
        if (!message.trim() || !locationName.trim() || !activityIcon) {
            setError("Udfyld venligst alle felter, inklusiv et ikon.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

        const { error: insertError } = await supabase.from('drop_in_invitations').insert({
            creator_user_id: user.id,
            message: message.trim(),
            location_name: locationName.trim(),
            activity_icon: activityIcon,
            expires_at: expiresAt,
        });

        if (insertError) {
            setError(`Kunne ikke oprette drop-in: ${insertError.message}`);
            setIsSubmitting(false);
        } else {
            navigate('/home');
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 dark:bg-dark-background h-full overflow-y-auto flex flex-col">
            <header className="flex items-center mb-6 max-w-lg mx-auto w-full">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage">
                    <ArrowLeft size={24} />
                </button>
            </header>
            
            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-full max-w-lg">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Start et Spontant Drop-in</h1>
                        <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Inviter andre til at joine dig, lige nu og her!</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
                        
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Hvad sker der?</label>
                            <textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="F.eks. 'Sidder på Café Nytorv med en ledig plads. Kom og sig hej!'..."
                                maxLength={150}
                                required
                            />
                            <p className="text-xs text-right text-gray-400 mt-1">{message.length} / 150</p>
                        </div>

                        <div>
                            <label htmlFor="locationName" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Lokation</label>
                            <input
                                type="text"
                                id="locationName"
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="F.eks. 'Café Nytorv' eller 'Kildeparken'"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Varighed</label>
                            <div className="grid grid-cols-3 gap-2">
                                {durationOptions.map(opt => (
                                    <button
                                        key={opt.hours}
                                        type="button"
                                        onClick={() => setDurationHours(opt.hours)}
                                        className={`p-3 rounded-lg border-2 text-sm font-semibold transition-colors ${durationHours === opt.hours ? 'border-primary bg-primary-light dark:bg-primary/20' : 'bg-white dark:bg-dark-surface hover:border-gray-300 dark:hover:border-dark-border'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Aktivitetsikon</label>
                            {iconsLoading ? (
                                <div className="flex items-center justify-center h-24 bg-gray-100 rounded-lg">
                                    <Loader2 className="animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                    {activityIcons.map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setActivityIcon(item.icon)}
                                            className={`p-3 rounded-lg border-2 text-2xl flex items-center justify-center transition-colors ${activityIcon === item.icon ? 'border-primary bg-primary-light dark:bg-primary/20' : 'bg-white dark:bg-dark-surface hover:border-gray-300 dark:hover:border-dark-border'}`}
                                            title={item.name}
                                            aria-label={item.name}
                                        >
                                            {item.icon}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50 flex items-center justify-center"
                            >
                                {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                                {isSubmitting ? 'Starter...' : 'Start Drop-in Nu!'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateDropInPage;
