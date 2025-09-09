import React from 'react';
import { motion } from 'framer-motion';
import { Shield, BrainCircuit } from 'lucide-react';

const SecurityPersonalityAnimation: React.FC = () => {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Pulsating background rings */}
      <motion.div
        className="absolute w-full h-full border-2 border-primary/20 rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute w-4/5 h-4/5 border-2 border-primary/30 rounded-full"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.6, 0.1, 0.6],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />
      
      {/* Central Shield */}
      <motion.div
        className="relative w-48 h-48 flex items-center justify-center"
        animate={{ y: [-5, 5] }}
        transition={{ duration: 5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      >
        <Shield size={180} className="text-primary opacity-20" strokeWidth={1} />
        <div className="absolute">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <BrainCircuit size={80} className="text-primary" strokeWidth={1.5} />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default SecurityPersonalityAnimation;
