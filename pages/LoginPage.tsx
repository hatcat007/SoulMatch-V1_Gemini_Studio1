import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabase';

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
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <div className="flex-shrink-0 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:text-primary">
          <ArrowLeft size={28} />
        </button>
        <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
        <div className="w-11 h-11" /> {/* Spacer for centering */}
      </div>
      <div className="flex-grow flex flex-col justify-center">
        <h1 className="text-4xl font-bold text-text-primary mb-8">Velkommen tilbage</h1>

        <form className="space-y-6" onSubmit={handleLogin}>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="din@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Adgangskode
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
        <p className="mt-6 text-center text-text-secondary">
          Har du ikke en bruger?{' '}
          <Link to="/signup" className="font-bold text-primary hover:underline">
            Opret en her
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;