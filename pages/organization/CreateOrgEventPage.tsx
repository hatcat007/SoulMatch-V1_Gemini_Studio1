import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Info, X, Calendar, Tag, MapPin, Smile, Image as ImageIcon } from 'lucide-react';
import { uploadFile } from '../../services/s3Service';
import type { Organization } from '../../types';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) {
            setError("Organization data not loaded. Cannot create event.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        
        const { error: insertError } = await supabase.from('events').insert({
            title,
            description,
            time,
            category,
            icon: emoji,
            color,
            organization_id: organization.id,
            host_name: organization.name,
            host_avatar_url: organization.logo_url,
        });

        if (insertError) {
            setError(insertError.message);
            setIsSubmitting(false);
        } else {
            navigate('/dashboard');
        }
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
                        disabled={isSubmitting}
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
