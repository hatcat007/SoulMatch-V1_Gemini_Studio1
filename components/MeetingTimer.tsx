import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';

interface MeetingTimerProps {
  matchTimestamp: string;
}

const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;

const MeetingTimer: React.FC<MeetingTimerProps> = ({ matchTimestamp }) => {
  const [remainingTime, setRemainingTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, progress: 100 });

  useEffect(() => {
    const deadline = new Date(matchTimestamp).getTime() + THREE_DAYS_IN_MS;
    let intervalId: number;

    const updateTimer = () => {
      const now = Date.now();
      const difference = deadline - now;

      if (difference <= 0) {
        setRemainingTime({ days: 0, hours: 0, minutes: 0, seconds: 0, progress: 0 });
        if (intervalId) clearInterval(intervalId);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      const progress = (difference / THREE_DAYS_IN_MS) * 100;
      
      setRemainingTime({ days, hours, minutes, seconds, progress });
    };

    updateTimer();
    intervalId = window.setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [matchTimestamp]);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (remainingTime.progress / 100) * circumference;

  return (
    <motion.div 
      className="flex flex-col items-center justify-center p-4 my-4 bg-primary-light dark:bg-primary/20 rounded-2xl max-w-sm mx-auto shadow-inner"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="flex items-center text-primary-dark dark:text-primary-light font-bold mb-3">
        <Timer size={20} className="mr-2" />
        <p>Tid til at arrangere møde</p>
      </div>

      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            strokeWidth="8"
            className="stroke-current text-primary/20 dark:text-primary/10"
            fill="transparent"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            strokeWidth="8"
            className="stroke-current text-primary"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false} // Don't animate on initial render, only on update
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'linear' }}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {remainingTime.progress > 0 ? (
                <>
                    <span className="text-2xl font-bold text-primary">{remainingTime.days}</span>
                    <span className="text-xs text-primary-dark dark:text-primary-light uppercase">Dage</span>
                </>
            ) : (
                 <span className="text-lg font-bold text-red-500">Udløbet</span>
            )}
        </div>
      </div>
      
      <div className="flex justify-center space-x-4 mt-3">
        <div className="text-center">
          <p className="font-bold text-lg text-primary">{String(remainingTime.hours).padStart(2, '0')}</p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Timer</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-lg text-primary">{String(remainingTime.minutes).padStart(2, '0')}</p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Minutter</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-lg text-primary">{String(remainingTime.seconds).padStart(2, '0')}</p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Sekunder</p>
        </div>
      </div>
       <p className="text-xs text-center text-text-secondary dark:text-dark-text-secondary mt-3 px-2">
            Chatten lukker, hvis I ikke bekræfter et fysisk møde via NFC check-in.
       </p>
    </motion.div>
  );
};

export default MeetingTimer;