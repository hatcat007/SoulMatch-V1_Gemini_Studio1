import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

// A simple component for the animated avatar graphic
const AvatarGraphic: React.FC<{ mainImage: string; orbitingImages: string[] }> = ({ mainImage, orbitingImages }) => (
    <div className="relative w-48 h-48">
        <img src={mainImage} alt="Main user" className="rounded-full w-48 h-48 border-4 border-white shadow-lg"/>
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
        <div className="relative w-48 h-48 flex items-center justify-center">
             <div className="absolute w-48 h-48 bg-blue-100 rounded-full"></div>
             <Shield size={96} className="text-primary z-10" strokeWidth={1.5}/>
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
    <div className="flex flex-col h-full bg-white text-center p-8 justify-between">
      <div className="flex-1 flex items-center justify-center min-h-0">
        {currentStep.graphic}
      </div>
      
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <h1 className="text-3xl font-bold text-text-primary mb-4">{currentStep.title}</h1>
        <p className="text-text-secondary text-lg mb-8 px-4">
          {currentStep.description}
        </p>
      </div>

      <div className="flex-shrink-0">
        <div className="flex justify-center space-x-2 mb-8">
            {onboardingSteps.map((_, index) => (
                <div key={index} className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${step === index ? 'bg-primary' : 'bg-gray-300'}`}></div>
            ))}
        </div>
        <button
          onClick={handleNext}
          className="block w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
        >
          Fortsæt
        </button>
        <p className="mt-4 text-text-secondary">
          Har du allerede en bruger? <Link to="/login" className="font-bold text-primary">Log ind</Link>
        </p>
      </div>
    </div>
  );
};

export default OnboardingPage;
