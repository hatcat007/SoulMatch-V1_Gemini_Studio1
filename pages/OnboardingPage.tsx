import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const AvatarGraphic: React.FC<{ images: string[] }> = ({ images }) => {
    if (images.length < 6) return null;

    const mainImage = images[0];
    const orbitingImages = images.slice(1, 6);

    const positions = [
        "w-14 h-14 absolute top-0 left-0 transform -translate-x-4 -translate-y-4",
        "w-12 h-12 absolute top-0 right-0 transform translate-x-4 -translate-y-2",
        "w-10 h-10 absolute bottom-0 right-0 transform translate-x-5 translate-y-3",
        "w-16 h-16 absolute bottom-0 left-0 transform -translate-x-6 translate-y-2",
        "w-8 h-8 absolute top-1/2 -left-10",
    ];

    return (
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80">
            <motion.img
                key={mainImage}
                src={mainImage}
                alt="Main user"
                className="rounded-full w-full h-full border-4 border-white shadow-lg object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: ["-4px", "4px"] }}
                transition={{
                    opacity: { duration: 2.0, ease: 'easeInOut' },
                    y: {
                        duration: 6,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                    },
                }}
            />
            {orbitingImages.map((src, index) => (
                <motion.img
                    key={src}
                    src={src}
                    alt={`User ${index + 1}`}
                    className={`rounded-full shadow-md object-cover ${positions[index]}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, y: ["-6px", "6px"] }}
                    transition={{
                        opacity: { duration: 2.0, ease: 'easeInOut' },
                        y: {
                            duration: 4 + Math.random() * 3, // Random duration between 4-7s
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut",
                            delay: Math.random() * 2, // Random delay to de-sync
                        },
                    }}
                />
            ))}
        </div>
    );
};


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
];

const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const [allImages, setAllImages] = useState<string[]>([]);
  const [displayImages, setDisplayImages] = useState<string[]>([]);

  // Fetch all images on mount
  useEffect(() => {
    const fetchImages = async () => {
      const { data, error } = await supabase.from('onboarding_images').select('image_url');
      if (error) {
        console.error("Error fetching onboarding images:", error);
      } else if (data && data.length > 0) {
        setAllImages(data.map(item => item.image_url));
      }
    };
    fetchImages();
  }, []);

  // Set initial images and start the interval once allImages is populated
  useEffect(() => {
    if (allImages.length < 6) return;

    // Set initial random images
    const initialShuffled = [...allImages].sort(() => 0.5 - Math.random());
    setDisplayImages(initialShuffled.slice(0, 6));

    const interval = setInterval(() => {
        setDisplayImages(currentDisplayImages => {
            if (currentDisplayImages.length === 0) return [];
            
            // 1. Pick a random image slot to update
            const imageSlotToUpdate = Math.floor(Math.random() * currentDisplayImages.length);

            // 2. Find a new image that is not currently displayed
            let newImage = '';
            const availableImages = allImages.filter(img => !currentDisplayImages.includes(img));
            
            if (availableImages.length > 0) {
                 newImage = availableImages[Math.floor(Math.random() * availableImages.length)];
            } else {
                // Fallback if all images are somehow displayed
                newImage = allImages[Math.floor(Math.random() * allImages.length)];
            }
            
            // 3. Create the new array with the updated image
            const nextDisplayImages = [...currentDisplayImages];
            nextDisplayImages[imageSlotToUpdate] = newImage;
            
            return nextDisplayImages;
        });
    }, 2500); // Change one image every 2.5 seconds

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [allImages]);

  const handleNext = () => {
    if (step < onboardingTextSteps.length - 1) {
      setStep(prevStep => prevStep + 1);
    } else {
      // Last step, navigate to signup
      navigate('/signup');
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
      
      if (displayImages.length === 6) {
        return (
            <motion.div
                key="avatar-graphic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
            >
              <AvatarGraphic images={displayImages} />
            </motion.div>
        );
      }
      
      return <div className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 bg-gray-200 rounded-full animate-pulse" key="pulse-graphic" />;
  };

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