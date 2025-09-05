import React from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  fullScreen?: boolean;
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ fullScreen = false, message }) => {
  const containerClasses = fullScreen
    ? "fixed inset-0 bg-background dark:bg-dark-background flex flex-col items-center justify-center z-[100]"
    : "flex flex-col items-center justify-center h-full w-full p-8";

  return (
    <motion.div
      key="loading-screen"
      className={containerClasses}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.img 
        src="https://q1f3.c3.e2-9.dev/soulmatch-uploads-public/SoulMatch%20logo.jpeg"
        alt="SoulMatch Logo" 
        className="w-48 h-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
      />
      {message && (
          <motion.p 
              className="mt-4 text-text-secondary dark:text-dark-text-secondary font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
          >
              {message}
          </motion.p>
      )}
    </motion.div>
  );
};

export default LoadingScreen;
