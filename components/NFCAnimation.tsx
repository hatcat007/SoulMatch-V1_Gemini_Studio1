import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Wifi, Ticket, CheckCircle, Zap } from 'lucide-react';

interface NFCAnimationProps {
  discountOffer?: string;
  onConnectionComplete?: () => void;
}

// Custom hook to get window size for responsiveness
const useWindowSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial size
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
};

// FIX: Define constants for motion components to help TypeScript resolve types.
const MotionDiv = motion.div;
const MotionP = motion.p;

const NFCAnimation: React.FC<NFCAnimationProps> = ({ discountOffer, onConnectionComplete }) => {
  const [animationState, setAnimationState] = useState<'idle' | 'approaching' | 'connecting' | 'connected' | 'complete'>('idle');
  const [connectionSpikes, setConnectionSpikes] = useState<number[]>([]);
  const { width } = useWindowSize();

  // Dynamic values based on screen width for a responsive animation
  const phoneScale = width < 768 ? 0.7 : 0.9;
  const phoneWidth = 120 * phoneScale;
  const idleX = width * 0.35;
  const approachX = width * 0.14;
  const connectX = phoneWidth * 0.55;

  useEffect(() => {
    const sequence = async () => {
      setAnimationState('idle');
      setConnectionSpikes([]);
      await new Promise(res => setTimeout(res, 500));
      setAnimationState('approaching');
      await new Promise(res => setTimeout(res, 2000));
      setAnimationState('connecting');
      setConnectionSpikes(Array.from({ length: 8 }, (_, i) => i));
      await new Promise(res => setTimeout(res, 2500));
      setAnimationState('connected');
      await new Promise(res => setTimeout(res, 1000));
      setAnimationState('complete');
      if (onConnectionComplete) {
        // Delay callback to let user see the final state
        setTimeout(onConnectionComplete, 3000);
      }
    };
    sequence();
  }, [onConnectionComplete]);

  const phoneVariants = (side: 'left' | 'right') => ({
    idle: { x: side === 'left' ? -idleX : idleX, rotate: side === 'left' ? -5 : 5, scale: 0.9 },
    approaching: { x: side === 'left' ? -approachX : approachX, rotate: side === 'left' ? -2 : 2, scale: 1 },
    connecting: { x: side === 'left' ? -connectX : connectX, rotate: 0, scale: 1.05 },
    connected: { x: side === 'left' ? -connectX : connectX, rotate: 0, scale: 1.05 },
  });
  
  const spikeVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: [0, 1.5, 0], opacity: [0, 1, 0],
      transition: { duration: 0.8, delay: i * 0.1, repeat: Infinity, repeatDelay: 0.5 }
    })
  };

  const PhoneComponent = () => (
    <div className="relative" style={{ width: `${phoneWidth}px`, height: `${phoneWidth * 1.8}px` }}>
      <div className="absolute inset-0 bg-slate-800 rounded-2xl shadow-2xl border-2 border-slate-700">
        <div className="absolute inset-1 bg-black rounded-xl overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-[#016a75] to-[#016a75]/80 flex items-center justify-center">
            <Smartphone className="text-white" style={{ width: `${phoneWidth * 0.3}px`, height: `${phoneWidth * 0.3}px` }} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-primary-light flex flex-col items-center justify-center p-4 overflow-hidden">
        <header className="text-center mb-12 absolute top-8 md:top-16">
            <MotionDiv initial={{y: -20, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.2}}>
                <h1 className="text-3xl md:text-4xl font-bold text-primary">NFC Mødeforbindelse</h1>
                <p className="text-primary/80 mt-2">Rør telefoner sammen for at forbinde og modtag din rabat</p>
            </MotionDiv>
        </header>

        <main className="relative flex-1 flex items-center justify-center w-full max-w-4xl">
            {/* Animation Container */}
            <MotionDiv
                initial={false}
                animate={{ opacity: animationState === 'complete' ? 0 : 1, scale: animationState === 'complete' ? 0.9 : 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                {/* Left Phone */}
                <MotionDiv variants={phoneVariants('left')} animate={animationState} transition={{ duration: 1.5, ease: "easeInOut" }}>
                    <PhoneComponent />
                </MotionDiv>
                
                {/* Right Phone */}
                <MotionDiv variants={phoneVariants('right')} animate={animationState} transition={{ duration: 1.5, ease: "easeInOut" }}>
                    <PhoneComponent />
                </MotionDiv>

                {/* NFC Effects */}
                <div className="absolute">
                    <AnimatePresence>
                        {animationState === 'connecting' && (
                            <MotionDiv initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center justify-center">
                                <Wifi className="text-primary" style={{ width: `${phoneWidth * 0.5}px`, height: `${phoneWidth * 0.5}px` }}/>
                                {connectionSpikes.map((_, i) => (
                                    <MotionDiv key={i} custom={i} variants={spikeVariants} initial="hidden" animate="visible" exit="hidden"
                                        style={{ top: '50%', left: '50%', position: 'absolute', transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-${phoneWidth * 0.45}px)` }}>
                                        <Zap className="text-yellow-400" style={{ width: `${phoneWidth * 0.15}px`, height: `${phoneWidth * 0.15}px` }} />
                                    </MotionDiv>
                                ))}
                            </MotionDiv>
                        )}
                         {animationState === 'connected' && (
                            <MotionDiv initial={{ scale: 0 }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
                                <CheckCircle className="text-green-500" style={{ width: `${phoneWidth * 0.6}px`, height: `${phoneWidth * 0.6}px` }} />
                            </MotionDiv>
                         )}
                    </AnimatePresence>
                </div>
            </MotionDiv>

            {/* Success Card */}
            <AnimatePresence>
                {animationState === 'complete' && (
                    <MotionDiv
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-full max-w-xs md:max-w-sm"
                    >
                        <div className="bg-primary shadow-2xl rounded-2xl p-6 md:p-8 text-white text-center">
                            <Ticket className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4" />
                            <h3 className="text-xl md:text-2xl font-bold mb-3">
                              Forbindelse Succesfuld!
                            </h3>
                            <div className="bg-white text-primary font-bold px-5 py-2 rounded-full text-base md:text-lg inline-block mb-4">
                              {discountOffer || 'Rabat modtaget!'}
                            </div>
                            <p className="text-white/90 text-sm">
                              Din møderabat er blevet anvendt
                            </p>
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </main>

        <footer className="h-20 flex items-center justify-center text-center text-primary/80 font-medium absolute bottom-4 md:bottom-8">
            <AnimatePresence mode="wait">
                <MotionP
                    key={animationState}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    {animationState === 'idle' && 'Klar til forbindelse'}
                    {animationState === 'approaching' && 'Enheder nærmer sig...'}
                    {animationState === 'connecting' && 'Etablerer NFC-forbindelse...'}
                    {animationState === 'connected' && 'Forbundet!'}
                    {animationState === 'complete' && 'Rabat anvendt!'}
                </MotionP>
            </AnimatePresence>
        </footer>
    </div>
  );
};

export default NFCAnimation;
