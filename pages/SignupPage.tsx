import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface SignupPageProps {
  onSignup: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignup }) => {
  const navigate = useNavigate();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd perform validation and API calls here
    onSignup();
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
        <h1 className="text-4xl font-bold text-text-primary mb-4">Opret en bruger</h1>
        <p className="text-text-secondary mb-8">
          Bliv en del af fællesskabet og bekæmp ensomhed.
        </p>
        <form className="space-y-6" onSubmit={handleSignup}>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Fulde navn
            </label>
            <input
              type="text"
              id="fullName"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Dit fulde navn"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="din@email.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Adgangskode
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Vælg en sikker adgangskode"
              required
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
            >
              Opret bruger
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-text-secondary">
          Har du allerede en bruger?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Log ind
          </Link>
        </p>
        <p className="mt-4 text-center text-text-secondary">
          Er du en organisation?{' '}
          <Link to="/create-organization" className="font-bold text-primary hover:underline">
            Opret profil her
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;