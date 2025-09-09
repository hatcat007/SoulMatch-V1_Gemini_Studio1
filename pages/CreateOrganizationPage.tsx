import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, Building, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CreateOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const [facebookUrl, setFacebookUrl] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (facebookUrl.trim()) {
        setIsModalOpen(true);
    }
  };

  const FeatureNoticeModal: React.FC = () => (
    <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsModalOpen(false)}
    >
        <motion.div
            className="bg-white dark:bg-dark-surface rounded-2xl p-6 w-full max-w-sm text-center relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
        >
            <button onClick={() => setIsModalOpen(false)} className="absolute top-3 right-3 p-1 text-gray-500 hover:text-gray-800 dark:text-dark-text-secondary dark:hover:text-dark-text-primary rounded-full">
                <X size={24} />
            </button>
            <div className="mx-auto inline-block bg-primary-light dark:bg-primary/20 text-primary p-3 rounded-full mb-4">
                <BrainCircuit size={32} strokeWidth={2} />
            </div>
            <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-2">Funktion Under Udvikling</h3>
            <p className="text-text-secondary dark:text-dark-text-secondary text-sm mb-6">
                Vores AI-import funktion er ikke helt klar endnu. Du kan i stedet oprette din profil manuelt.
            </p>
            <button
                onClick={() => navigate('/confirm-organization', { state: { manual: true } })}
                className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
            >
                Opret Manuelt
            </button>
        </motion.div>
    </motion.div>
  );

  return (
    <>
     <AnimatePresence>
        {isModalOpen && <FeatureNoticeModal />}
     </AnimatePresence>

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
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
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
    </>
  );
};

export default CreateOrganizationPage;