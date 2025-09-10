import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ArrowRight, Lock, Puzzle } from 'lucide-react';

interface AnimatedTextCycleProps {
  words: string[];
  interval?: number;
  className?: string;
}

const AnimatedTextCycle: React.FC<AnimatedTextCycleProps> = ({
  words,
  interval = 2500,
  className = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, words.length]);

  const containerVariants: Variants = {
    hidden: { y: -15, opacity: 0, filter: "blur(5px)" },
    visible: { y: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.4, ease: "easeOut" } },
    exit: { y: 15, opacity: 0, filter: "blur(5px)", transition: { duration: 0.3, ease: "easeIn" } },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={currentIndex}
        className={`inline-block ${className}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {words[currentIndex]}
      </motion.span>
    </AnimatePresence>
  );
};

const AnimatedButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary';
}> = ({ children, onClick, className = '', variant = 'primary' }) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyles = "group relative overflow-hidden rounded-full px-8 py-4 font-bold text-lg transition-all duration-300 transform hover:scale-105";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-dark shadow-lg hover:shadow-primary/30",
    secondary: "bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
        <motion.div
          animate={{ x: isHovered ? 4 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <ArrowRight size={20} />
        </motion.div>
      </span>
    </button>
  );
};

const FloatingElements: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-primary/30 rounded-full"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{ y: [0, -30, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

const PublicAuthModal: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);

    const loginWords = ["sikkerhed", "tryghed", "fællesskab", "venskaber"];
    const personalityWords = ["din personlighed", "de bedste matches", "nye oplevelser", "et stærkt fællesskab"];
    
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5, staggerChildren: 0.15 } }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
    };
    
    const handleNavigation = () => {
        navigate('/login');
    }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-hidden">
      <FloatingElements />
      
      <div className="relative z-10 w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="login"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: -100, transition: { duration: 0.4, ease: 'easeInOut' } }}
              className="text-center space-y-6"
            >
              <motion.div variants={itemVariants} className="inline-block bg-primary-light dark:bg-primary/20 p-4 rounded-2xl"><Lock className="text-primary" size={32}/></motion.div>
              
              <motion.h1 variants={itemVariants} className="text-3xl md:text-4xl font-bold text-text-primary dark:text-dark-text-primary">
                  Login som alle andre – med MitID
              </motion.h1>

              <motion.div
                className="bg-white dark:bg-dark-surface rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-dark-border shadow-lg"
                variants={itemVariants}
              >
                <div className="space-y-4 text-text-secondary dark:text-dark-text-secondary">
                  <p className="text-lg leading-relaxed">
                    For din og alles{" "}
                    <AnimatedTextCycle 
                      words={loginWords}
                      className="font-bold text-primary bg-primary-light dark:bg-primary/20 px-3 py-1 rounded-lg"
                    />
                    {" "}
                  </p>
                  
                  <p className="opacity-90">
                    I kampen mod ensomhed og for trygge møder i virkeligheden.
                  </p>
                  
                  <div className="font-semibold text-text-primary dark:text-dark-text-primary pt-2">
                      👉 Et klik, et login – og du er klar til fællesskabet 🚀✨
                  </div>
                </div>

                <motion.div className="mt-8">
                  <AnimatedButton onClick={() => setCurrentStep(1)} variant="primary">
                    Fortsæt
                  </AnimatedButton>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="personality"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeInOut', staggerChildren: 0.15 } }}
              exit={{ opacity: 0, x: 100, transition: { duration: 0.4, ease: 'easeInOut' } }}
              className="text-center space-y-6"
            >
               <motion.div variants={itemVariants} className="inline-block bg-primary-light dark:bg-primary/20 p-4 rounded-2xl"><Puzzle className="text-primary" size={32}/></motion.div>

              <motion.h1 variants={itemVariants} className="text-3xl md:text-4xl font-bold text-text-primary dark:text-dark-text-primary">
                  Tag AI personlighedstesten ✨
              </motion.h1>

              <motion.div
                className="bg-white dark:bg-dark-surface rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-dark-border shadow-lg"
                variants={itemVariants}
              >
                <div className="space-y-4 text-text-secondary dark:text-dark-text-secondary">
                  <p className="text-lg leading-relaxed">
                    Lær dig selv bedre at kende – og find ud af, hvordan du Soul matcher med{" "}
                    <AnimatedTextCycle 
                      words={personalityWords}
                      className="font-bold text-primary bg-primary-light dark:bg-primary/20 px-3 py-1 rounded-lg"
                    />
                    , der giver mening for dig.
                  </p>
                  
                  <p className="opacity-90">
                    💡 Det tager kun få minutter, men kan åbne døren til venskaber, oplevelser og fællesskab i kampen mod ensomhed.
                  </p>
                  
                  <div className="font-semibold text-text-primary dark:text-dark-text-primary pt-2">
                    👉 Klar? Lad os finde din vibe 🎯
                  </div>
                </div>

                <motion.div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
                  <AnimatedButton onClick={handleNavigation} variant="primary">
                    Kom i gang
                  </AnimatedButton>
                   <button onClick={() => setCurrentStep(0)} className="font-bold text-sm text-text-secondary dark:text-dark-text-secondary hover:underline px-4 py-2">
                      Tilbage
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PublicAuthModal;