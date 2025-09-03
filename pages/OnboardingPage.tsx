
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

// A simple component for the animated avatar graphic
const AvatarGraphic: React.FC<{ mainImage: string; orbitingImages: string[] }> = ({ mainImage, orbitingImages }) => (
    <div className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80">
        <img src={mainImage} alt="Main user" className="rounded-full w-full h-full border-4 border-white shadow-lg"/>
        {/* These positions are approximations based on the design */}
        <img src={orbitingImages[0]} alt="User 1" className="rounded-full w-14 h-14 absolute top-0 left-0 transform -translate-x-4 -translate-y-4 shadow-md"/>
        <img src={orbitingImages[1]} alt="User 2" className="rounded-full w-12 h-12 absolute top-0 right-0 transform translate-x-4 -translate-y-2 shadow-md"/>
        <img src={orbitingImages[2]} alt="User 3" className="rounded-full w-10 h-10 absolute bottom-0 right-0 transform translate-x-5 translate-y-3 shadow-md"/>
        <img src={orbitingImages[3]} alt="User 4" className="rounded-full w-16 h-16 absolute bottom-0 left-0 transform -translate-x-6 translate-y-2 shadow-md"/>
        <img src={orbitingImages[4]} alt="User 5" className="rounded-full w-8 h-8 absolute top-1/2 -left-10 shadow-md"/>
    </div>
);

// Define the steps for the onboarding flow
const onboardingSteps = [
  {
    graphic: <AvatarGraphic mainImage="https://picsum.photos/id/1005/200/200" orbitingImages={[
        'https://picsum.photos/id/1011/50/50',
        'https://picsum.photos/id/1025/50/50',
        'https://picsum.photos/id/1012/50/50',
        'https://picsum.photos/id/1013/50/50',
        'https://picsum.photos/id/1014/50/50',
    ]} />,
    title: "Find din nye SoulMate",
    description: "SoulMatch bruger en avanceret AI algoritme til at finde din nye soulmate.",
  },
  {
    graphic: <AvatarGraphic mainImage="https://picsum.photos/id/1027/200/200" orbitingImages={[
        'https://picsum.photos/id/1028/50/50',
        'https://picsum.photos/id/1029/50/50',
        'https://picsum.photos/id/1031/50/50',
        'https://picsum.photos/id/1032/50/50',
        'https://picsum.photos/id/1033/50/50',
    ]} />,
    title: "Valgfri personlighedsanalyse",
    description: "For at sikre det bedste soulmate match anbefaler vi du får lavet en personlighedanalyse inde i appen.",
  },
  {
    graphic: (
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
             <div className="absolute w-full h-full bg-blue-100 dark:bg-primary/20 rounded-full"></div>
             <Shield size={128} className="text-primary z-10" strokeWidth={1.5}/>
        </div>
    ),
    title: "Sikkerhed er utrolig vigtigt",
    description: "For at bruge vores app, skal du verificeres via. dit MitID. Derefter ansigts godkendelse.",
  },
];


const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < onboardingSteps.length - 1) {
      setStep(prevStep => prevStep + 1);
    } else {
      // Last step, navigate to signup
      navigate('/signup');
    }
  };

  const currentStep = onboardingSteps[step];

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-dark-background flex flex-col">
        <header className="p-6 self-start">
             <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
        </header>
        <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 items-center justify-items-center gap-8 px-6 pb-8">
            {/* Left: Graphic */}
            <div className="hidden lg:flex items-center justify-center w-full h-full">
                <div className="transform scale-110">
                    {currentStep.graphic}
                </div>
            </div>

             {/* Right / Main Content */}
            <div className="w-full max-w-md flex flex-col items-center text-center">
                 {/* Graphic for mobile */}
                <div className="flex-1 flex items-center justify-center min-h-0 my-4 lg:hidden">
                    {currentStep.graphic}
                </div>
                
                <div className="flex-1 flex flex-col justify-center min-h-0 mt-8">
                    <h2 className="text-3xl sm:text-4xl font-bold text-text-primary dark:text-dark-text-primary mb-4">{currentStep.title}</h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary text-lg mb-8 px-4">
                        {currentStep.description}
                    </p>
                </div>

                <div className="w-full flex-shrink-0">
                    <div className="flex justify-center space-x-2 mb-8">
                        {onboardingSteps.map((_, index) => (
                            <div key={index} className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${step === index ? 'bg-primary' : 'bg-gray-300 dark:bg-dark-border'}`}></div>
                        ))}
                    </div>
                    <button
                        onClick={handleNext}
                        className="block w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
                    >
                        Fortsæt
                    </button>
                    <p className="mt-4 text-text-secondary dark:text-dark-text-secondary">
                        Har du allerede en bruger? <Link to="/login" className="font-bold text-primary hover:underline">Log ind</Link>
                    </p>
                </div>
            </div>
        </main>
    </div>
  );
};

export default OnboardingPage;
