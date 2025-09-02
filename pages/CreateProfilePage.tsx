import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const CreateProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [location, setLocation] = useState('');
    const [bio, setBio] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setError('Du skal være logget ind for at oprette en profil.');
            setLoading(false);
            navigate('/login');
            return;
        }
        
        const ageNumber = parseInt(age, 10);
        if (isNaN(ageNumber) || ageNumber <= 0) {
            setError('Indtast venligst en gyldig alder.');
            setLoading(false);
            return;
        }

        const { error: insertError } = await supabase.from('users').insert({
            auth_id: user.id,
            name,
            age: ageNumber,
            location,
            bio,
            avatar_url: `https://i.pravatar.cc/80?u=${user.id}`,
        });

        if (insertError) {
            setError(insertError.message);
            setLoading(false);
        } else {
            // Success! Reload the app to trigger the profile check in App.tsx.
            window.location.reload();
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-dark-background">
            <div className="flex-shrink-0 text-center">
                <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
            </div>
            <div className="flex-grow flex flex-col justify-center">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-2">Fortæl os lidt om dig selv</h1>
                <p className="text-text-secondary dark:text-dark-text-secondary mb-8">
                    Disse oplysninger hjælper os med at finde de bedste matches til dig.
                </p>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg">{error}</p>}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                            Fulde navn
                        </label>
                        <input
                            type="text" id="name" value={name} onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Dit fulde navn" required autoComplete="name"
                        />
                    </div>
                     <div>
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                            Alder
                        </label>
                        <input
                            type="number" id="age" value={age} onChange={(e) => setAge(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Din alder" required
                        />
                    </div>
                     <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                            Lokation
                        </label>
                        <input
                            type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="F.eks. Aalborg, Danmark" required autoComplete="address-level2"
                        />
                    </div>
                     <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                            Kort bio
                        </label>
                        <textarea
                            id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Fortæl lidt om dine interesser..." required
                        ></textarea>
                    </div>
                    <div>
                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50"
                        >
                            {loading ? 'Gemmer...' : 'Gem og fortsæt'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProfilePage;
