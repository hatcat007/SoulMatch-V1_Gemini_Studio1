import React from 'react';
import type { UserPersonalityDimension } from '../types';
import { motion } from 'framer-motion';

interface PersonalityDimensionChartProps {
  dimensions: UserPersonalityDimension[];
}

const dimensionDetails = {
    EI: { left: 'Introvert', right: 'Ekstrovert' },
    SN: { left: 'Sansning', right: 'Intuition' },
    TF: { left: 'Tænkning', right: 'Følen' },
    JP: { left: 'Vurderende', right: 'Opfattende' },
};

const DimensionBar: React.FC<{ dimension: UserPersonalityDimension }> = ({ dimension }) => {
    const details = dimensionDetails[dimension.dimension];
    const isLeftDominant = dimension.dominant_trait === 'I' || dimension.dominant_trait === 'S' || dimension.dominant_trait === 'T' || dimension.dominant_trait === 'J';
    
    const leftScore = isLeftDominant ? dimension.score : 100 - dimension.score;
    const rightScore = 100 - leftScore;

    const mainColor = 'bg-[#016a75]';
    const darkColor = 'bg-[#00464f]';

    const leftIsDominant = leftScore >= rightScore;
    const leftColor = leftIsDominant ? mainColor : darkColor;
    const rightColor = !leftIsDominant ? mainColor : darkColor;

    return (
        <motion.div 
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="flex justify-between items-center mb-1 text-sm font-bold text-text-primary dark:text-dark-text-primary">
                <span>{details.left}</span>
                <span>{details.right}</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-dark-border rounded-full flex overflow-hidden">
                <motion.div
                    className={leftColor}
                    initial={{ width: '50%' }}
                    animate={{ width: `${leftScore}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                />
                <motion.div
                    className={rightColor}
                    initial={{ width: '50%' }}
                    animate={{ width: `${rightScore}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                />
            </div>
            <p className="mt-3 text-sm text-text-secondary dark:text-dark-text-secondary leading-relaxed">
                {dimension.description}
            </p>
        </motion.div>
    );
};


const PersonalityDimensionChart: React.FC<PersonalityDimensionChartProps> = ({ dimensions }) => {
  if (!dimensions || dimensions.length !== 4) {
    return (
        <div className="flex items-center justify-center h-full text-sm text-gray-500 p-8">
            Personlighedsdata er ikke komplet. Udfyld venligst personlighedstesten.
        </div>
    );
  }
  
  // Ensure a consistent order
  const orderedDimensions = ['EI', 'SN', 'TF', 'JP'].map(d => dimensions.find(dim => dim.dimension === d)).filter((d): d is UserPersonalityDimension => d !== undefined);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-lg space-y-8">
            {orderedDimensions.map(dim => (
                <DimensionBar key={dim.dimension} dimension={dim} />
            ))}
        </div>
    </div>
  );
};

export default PersonalityDimensionChart;