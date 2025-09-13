

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabase';
import AnimatedAvatarGraphic from '../components/AnimatedAvatarGraphic';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success, the onAuthStateChange listener in App.tsx will handle navigation.
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-gray-50 dark:bg-dark-background">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-primary-light dark:bg-dark-surface p-12 text-center">
         <h1 className="text-4xl font-bold text-primary mb-8">SoulMatch</h1>
          <div className="transform scale-110">
            <AnimatedAvatarGraphic />
          </div>
        <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-12">Find din nye SoulMate</h2>
        <p className="text-text-secondary dark:text-dark-text-secondary text-lg mt-4 max-w-sm">
          Bliv en del af et fællesskab, der bringer folk sammen og bekæmper ensomhed.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-primary lg:hidden">SoulMatch</h1>
             <div className="w-8 lg:hidden" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary dark:text-dark-text-primary mb-2">Velkommen tilbage</h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mb-8">Log ind for at fortsætte til SoulMatch.</p>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && <p className="text-red-500 text-center bg-red-100 dark:bg-red-500/10 dark:text-red-400 p-3 rounded-lg">{error}</p>}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="din@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                  Adgangskode
                </label>
                <Link to="#" className="text-sm font-semibold text-primary hover:underline">
                  Glemt?
                </Link>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="********"
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50"
              >
                {loading ? 'Logger ind...' : 'Log ind'}
              </button>
            </div>
          </form>
           <div className="mt-8 text-center bg-primary-light dark:bg-primary/10 p-3 rounded-lg">
            <p className="text-sm font-semibold text-primary-dark dark:text-primary-light">BETA V1</p>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
              Oprettelse kræver en invitationskode.
            </p>
          </div>
          <p className="mt-4 text-center text-text-secondary dark:text-dark-text-secondary">
            Har du ikke en bruger?{' '}
            <Link to="/signup" className="font-bold text-primary hover:underline">
              Opret en her
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
