import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, Award, Star, X } from 'lucide-react';

interface CertificationAnimationProps {
  onClose: () => void;
  title?: string;
  subtitle?: string;
  features?: string[];
}

const SoulmatchCertification: React.FC<CertificationAnimationProps> = ({
  onClose,
  title = "SoulMatch Certificeret Mødested",
  subtitle = "Et trygt og anbefalet sted at starte nye venskaber.",
  features = [
    "Trygge & Rare Rammer",
    "Imødekommende Atmosfære",
    "SoulMatch Rabat Tilgængelig",
    "Anbefalet af Fællesskabet"
  ],
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentFeature, setCurrentFeature] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [features.length]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height
        });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  const primaryColor = "#016a75";
  const lightColor = "#4a9aa8";
  const slate50 = "#f8fafc";
  const slate100 = "#f1f5f9";

  return (
    <motion.div 
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, ${lightColor}25 0%, transparent 50%),
          linear-gradient(to bottom right, ${slate50}, ${slate100})
        `
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 text-slate-600 hover:text-slate-900 bg-white/50 rounded-full">
          <X size={24} />
      </button>
      
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <motion.path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke={primaryColor}
                strokeWidth="0.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={{ duration: 2, delay: 0.5 }}
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="relative mb-8"
        >
          <div 
            className="w-32 h-32 rounded-full flex items-center justify-center shadow-2xl border-4"
            style={{ backgroundColor: primaryColor, borderColor: lightColor, boxShadow: `0 20px 40px ${primaryColor}30` }}
          >
            <Award className="w-16 h-16 text-white" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-center mb-6"
        >
          <h1 
            className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${lightColor})` }}
          >
            {title.split(' ').map((word, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.2, duration: 0.6 }}
                className="inline-block mr-3"
              >
                {word}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto"
          >
            {subtitle}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
        >
          {features.map((feature, index) => {
            const IconComponent = [Shield, CheckCircle, Award, Star][index % 4];
            return (
                <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2 + index * 0.2, duration: 0.6 }}
                className={`p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${
                    currentFeature === index ? 'shadow-xl scale-105' : 'shadow-lg hover:shadow-xl hover:scale-102'
                }`}
                style={{
                    backgroundColor: currentFeature === index ? `${primaryColor}15` : 'rgba(255, 255, 255, 0.8)',
                    borderColor: currentFeature === index ? primaryColor : 'rgba(255, 255, 255, 0.3)'
                }}
                >
                    <div className="flex items-center space-x-4">
                        <motion.div
                        animate={{ scale: currentFeature === index ? 1.2 : 1, rotate: currentFeature === index ? 360 : 0 }}
                        transition={{ duration: 0.5 }}
                        className="p-3 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                        >
                           <IconComponent className="w-6 h-6 text-white" />
                        </motion.div>
                        <span className="text-lg font-semibold" style={{ color: currentFeature === index ? primaryColor : '#475569' }}>
                        {feature}
                        </span>
                    </div>
                </motion.div>
            );
          })}
        </motion.div>
        
         <motion.div
            className="w-full max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3, duration: 0.8 }}
         >
            <button
                onClick={onClose}
                className="w-full bg-primary text-white font-bold py-3 px-6 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
            >
                Gå til mødestedet
            </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SoulmatchCertification;
