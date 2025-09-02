import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BrainCircuit } from 'lucide-react';

const CreateOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const [facebookUrl, setFacebookUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would pass the URL to the next page,
    // possibly via state or query params, to fetch data.
    // For this mock, we just navigate.
    navigate('/confirm-organization');
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-dark-background">
      <div className="flex-shrink-0 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
          <ArrowLeft size={28} />
        </button>
        <h1 className="text-xl font-bold text-primary">SoulMatch</h1>
        <div className="w-11 h-11" /> {/* Spacer for centering */}
      </div>
      <div className="flex-grow flex flex-col justify-center text-center">
        <div className="mx-auto bg-primary-light dark:bg-primary/20 text-primary dark:text-primary-light p-4 rounded-full mb-6">
            <BrainCircuit size={40} strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-2">Opret din SoulMatch organisation side</h1>
        <p className="text-text-secondary dark:text-dark-text-secondary mb-8">
            Indhent nemt data via. AI
        </p>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="facebookUrl" className="sr-only">
              Facebook side link
            </label>
            <input
              type="url"
              id="facebookUrl"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              className="w-full text-center px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Indsæt link til jeres Facebook side"
              required
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
            >
              Fortsæt
            </button>
          </div>
        </form>
         <p className="mt-6 text-center text-text-secondary dark:text-dark-text-secondary text-sm">
          Har du ikke en Facebook side?{' '}
          <Link to="/signup" className="font-bold text-primary hover:underline">
            Opret manuelt
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CreateOrganizationPage;
