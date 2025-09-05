
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, Building } from 'lucide-react';

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
     <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-gray-50 dark:bg-dark-background">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-primary-light dark:bg-dark-surface p-12 text-center">
         <h1 className="text-4xl font-bold text-primary mb-8">SoulMatch</h1>
          <div className="relative w-64 h-64 flex items-center justify-center">
             <div className="absolute w-full h-full bg-white dark:bg-dark-surface-light rounded-full"></div>
             <Building size={128} className="text-primary z-10" strokeWidth={1.5}/>
        </div>
        <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-12">Bliv en del af fællesskabet</h2>
        <p className="text-text-secondary dark:text-dark-text-secondary text-lg mt-4 max-w-sm">
          Opret en profil for din organisation og vær med til at skabe meningsfulde events, mødesteder og tilbud i kampen om ensomhed i Danmark.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => navigate('/signup')} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-primary lg:hidden">SoulMatch</h1>
             <div className="w-8 lg:hidden" />
          </div>

          <div className="text-center">
            <div className="mx-auto inline-block bg-primary-light dark:bg-primary/20 text-primary dark:text-primary-light p-4 rounded-full mb-4">
                <BrainCircuit size={40} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary dark:text-dark-text-primary mb-2">Opret din side</h2>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-8">
                Indhent nemt data via. AI ved at indsætte et link til jeres Facebook side.
            </p>
          </div>
        
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
          <p className="mt-8 text-center text-text-secondary dark:text-dark-text-secondary text-sm">
            Har du ikke en Facebook side?{' '}
            <Link to="/confirm-organization" state={{ manual: true }} className="font-bold text-primary hover:underline">
              Opret manuelt
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateOrganizationPage;