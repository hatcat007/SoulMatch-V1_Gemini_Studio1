import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedAvatarGraphic from '../components/AnimatedAvatarGraphic';


// Define the steps for the onboarding flow (text content only)
const onboardingTextSteps = [
  {
    title: "Find din nye SoulMate",
    description: "SoulMatch bruger en avanceret AI algoritme til at finde din nye soulmate.",
  },
  {
    title: "Valgfri personlighedsanalyse",
    description: "For at sikre det bedste soulmate match anbefaler vi du får lavet en personlighedanalyse inde i appen.",
  },
  {
    title: "Sikkerhed er utrolig vigtigt",
    description: "For at bruge vores app, skal du verificeres via. dit MitID. Derefter ansigts godkendelse.",
  },
  {
    title: "Vælg din profiltype",
    description: "Fortæl os, hvordan du vil bruge SoulMatch, så vi kan skræddersy din oplevelse."
  }
];

const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < onboardingTextSteps.length - 1) {
      setStep(prevStep => prevStep + 1);
    }
  };

  const currentStepContent = onboardingTextSteps[step];
  
  const renderGraphic = () => {
      if (step === 2) { // The safety step has a static shield icon
          return (
              <motion.div
                  key="shield-graphic"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
              >
                <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
                    <div className="absolute w-full h-full bg-blue-100 dark:bg-primary/20 rounded-full"></div>
                    <Shield size={128} className="text-primary z-10" strokeWidth={1.5}/>
                </div>
              </motion.div>
          );
      }
      
      // For all other steps (0, 1, and the new choice step 3), show the animated avatars
      return <AnimatedAvatarGraphic key="avatar-graphic" />;
  };

  const ChoiceCard: React.FC<{ icon: React.ReactNode, title: string, description: string, to: string }> = ({ icon, title, description, to }) => (
      <Link to={to} className="block w-full">
          <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-dark-border text-center flex flex-col items-center h-full"
          >
              <div className="bg-primary-light dark:bg-primary/20 text-primary p-4 rounded-full mb-4">
                  {icon}
              </div>
              <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-2">{title}</h3>
              <p className="text-text-secondary dark:text-dark-text-secondary text-sm">{description}</p>
          </motion.div>
      </Link>
  );

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-dark-background flex flex-col">
        <header className="p-6 self-start">
             <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
        </header>
        <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 items-center justify-items-center gap-8 px-6 pb-8">
            {/* Left: Graphic */}
            <div className="hidden lg:flex items-center justify-center w-full h-full">
                <div className="transform scale-110">
                    <AnimatePresence mode="wait">
                        {renderGraphic()}
                    </AnimatePresence>
                </div>
            </div>

             {/* Right / Main Content */}
            <div className="w-full max-w-md flex flex-col items-center text-center">
                 {/* Graphic for mobile */}
                <div className="flex-1 flex items-center justify-center min-h-0 my-4 lg:hidden">
                    <AnimatePresence mode="wait">
                        {renderGraphic()}
                    </AnimatePresence>
                </div>
                
                <div className="flex-1 flex flex-col justify-center min-h-0 mt-8">
                    <h2 className="text-3xl sm:text-4xl font-bold text-text-primary dark:text-dark-text-primary mb-4">{currentStepContent.title}</h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary text-lg mb-8 px-4">
                        {currentStepContent.description}
                    </p>
                </div>

                <div className="w-full flex-shrink-0">
                    {step === 3 ? (
                        <div className="space-y-4 sm:space-y-0 sm:flex sm:gap-4">
                             <ChoiceCard
                                to="/signup"
                                icon={<User size={32} strokeWidth={2}/>}
                                title="Jeg er en Bruger"
                                description="Jeg vil finde nye venner og deltage i events."
                            />
                             <ChoiceCard
                                to="/create-organization"
                                icon={<Building size={32} strokeWidth={2}/>}
                                title="Jeg er en Organisation"
                                description="Jeg vil oprette events og tilbud for fællesskabet."
                            />
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-center space-x-2 mb-8">
                                {onboardingTextSteps.map((_, index) => (
                                    <div key={index} className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${step === index ? 'bg-primary' : 'bg-gray-300 dark:bg-dark-border'}`}></div>
                                ))}
                            </div>
                            <button
                                onClick={handleNext}
                                className="block w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
                            >
                                Fortsæt
                            </button>
                        </>
                    )}
                    <p className="mt-6 text-text-secondary dark:text-dark-text-secondary">
                        Har du allerede en bruger? <Link to="/login" className="font-bold text-primary hover:underline">Log ind</Link>
                    </p>
                </div>
            </div>
        </main>
    </div>
  );
};

export default OnboardingPage;