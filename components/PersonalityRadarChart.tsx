import React, { useState, useEffect } from 'react';
import type { UserTrait } from '../types';
import { motion } from 'framer-motion';

interface PersonalityRadarChartProps {
  traits: UserTrait[];
}

const PersonalityRadarChart: React.FC<PersonalityRadarChartProps> = ({ traits }) => {
  const [dimensions, setDimensions] = useState({ width: 380, height: 380 });
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const updateDimensions = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const isMobileDevice = screenWidth < 768;
      
      setIsMobile(isMobileDevice);
      
      if (isMobileDevice) {
        // Mobile: Use smaller size with more padding
        const availableWidth = Math.min(screenWidth - 40, 320);
        const availableHeight = Math.min(screenHeight * 0.4, 320);
        const size = Math.min(availableWidth, availableHeight);
        setDimensions({ width: size, height: size });
      } else if (screenWidth < 1024) {
        // Tablet: Medium size
        const size = Math.min(screenWidth * 0.5, 350);
        setDimensions({ width: size, height: size });
      } else {
        // Desktop: Full size
        setDimensions({ width: 380, height: 380 });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  const size = Math.min(dimensions.width, dimensions.height);
  const center = size / 2;
  const numLevels = 5;
  const maxValue = 100;

  // Ensure we have exactly 5 traits for a pentagon
  if (!traits || traits.length !== 5) {
    return (
        <div className="flex items-center justify-center h-full text-sm text-gray-500">
            Personlighedsdata er ikke komplet.
        </div>
    );
  }
  
  // Specific order for Big Five model for consistent layout
  const orderedTraits = [
      'Openness', 
      'Conscientiousness', 
      'Extraversion', 
      'Agreeableness', 
      'Neuroticism'
  ].map(traitName => traits.find(t => t.trait === traitName) || { trait: traitName, value: 0, user_id: 0 });

  const numAxes = orderedTraits.length;
  const angleSlice = (Math.PI * 2) / numAxes;

  // Calculate polygon points for the chart data
  const dataPoints = orderedTraits.map((trait, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const value = trait.value;
    const radius = (value / maxValue) * (center * 0.7); // Reduced radius to give more space
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  // Calculate axis and label positions with responsive adjustments
  const axes = orderedTraits.map((trait, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x = center + center * 0.8 * Math.cos(angle); // Reduced axis length
    const y = center + center * 0.8 * Math.sin(angle);
    
    // More conservative label positioning to prevent cutoff
    const labelRadius = isMobile ? center * 0.75 : center * 0.8;
    const labelX = center + labelRadius * Math.cos(angle);
    const labelY = center + labelRadius * Math.sin(angle);
    
    return {
      x1: center,
      y1: center,
      x2: x,
      y2: y,
      label: trait.trait,
      labelX: labelX,
      labelY: labelY,
    };
  });
  
  // Responsive text sizes and spacing
  const textSizes = {
    label: isMobile ? 'text-xs' : size < 350 ? 'text-sm' : 'text-sm',
    percentage: isMobile ? 'text-xs' : 'text-xs',
  };
  
  const strokeWidth = isMobile ? '2' : '2.5';
  const circleRadius = isMobile ? '3' : '5';

  // Add padding to viewBox to prevent text cutoff
  const viewBoxPadding = isMobile ? 30 : 40;
  const viewBoxSize = size + (viewBoxPadding * 2);
  const translateOffset = viewBoxPadding;

  return (
    <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
            <svg 
                width={size} 
                height={size} 
                viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
                className="w-full h-auto"
                style={{ maxWidth: '100%', height: 'auto' }}
            >
                <g transform={`translate(${translateOffset}, ${translateOffset + (isMobile ? 10 : 20)})`}>
                {/* Grid Levels */}
                {Array.from({ length: numLevels }).map((_, levelIndex) => {
                    const radius = ((levelIndex + 1) / numLevels) * (center * 0.7);
                    const points = orderedTraits.map((_, i) => {
                        const angle = angleSlice * i - Math.PI / 2;
                        const x = center + radius * Math.cos(angle);
                        const y = center + radius * Math.sin(angle);
                        return `${x},${y}`;
                    }).join(' ');
                    return <polygon key={levelIndex} points={points} fill="none" stroke="#E5E7EB" strokeWidth="1" className="dark:stroke-dark-border" />;
                })}
                
                {/* Axes and Labels */}
                {axes.map((axis, i) => {
                    const trait = orderedTraits[i];
                    const textAnchor = Math.abs(axis.labelX - center) < 1 ? 'middle' : axis.labelX > center ? 'start' : 'end';
                    
                    // Better text positioning to prevent cutoff
                    let dy = "0.35em";
                    let percentageDy = 1.2;
                    
                    // Adjust positioning based on angle to prevent cutoff
                    const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                    if (angle < -Math.PI * 0.75 || angle > Math.PI * 0.75) {
                        // Top labels
                        dy = "1.2em";
                        percentageDy = 2.4;
                    } else if (angle > Math.PI * 0.25 && angle < Math.PI * 0.75) {
                        // Bottom labels
                        dy = "-0.8em";
                        percentageDy = 0.4;
                    }

                    return (
                        <g key={i}>
                            <line x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="#E5E7EB" strokeWidth="1" className="dark:stroke-dark-border" />
                            <text x={axis.labelX} y={axis.labelY} dy={dy} textAnchor={textAnchor} className={`${textSizes.label} font-bold fill-current text-text-primary dark:text-dark-text-primary`}>
                                {axis.label}
                            </text>
                             <text x={axis.labelX} y={axis.labelY} dy={percentageDy + 'em'} textAnchor={textAnchor} className={`${textSizes.percentage} font-semibold fill-current text-text-secondary dark:text-dark-text-secondary`}>
                                ({trait.value}%)
                            </text>
                        </g>
                    )
                })}

                {/* Data Polygon */}
                <motion.polygon 
                    points={dataPoints} 
                    fill="rgba(0, 107, 118, 0.4)" 
                    stroke="#005F69" 
                    strokeWidth={strokeWidth}
                    initial={{ scale: 0.5, opacity: 0, transformOrigin: 'center' }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
                />
                
                {/* Data Points */}
                {orderedTraits.map((trait, i) => {
                    const angle = angleSlice * i - Math.PI / 2;
                    const radius = (trait.value / maxValue) * (center * 0.7);
                    const x = center + radius * Math.cos(angle);
                    const y = center + radius * Math.sin(angle);
                    return (
                        <motion.circle 
                            key={i} 
                            cx={x} 
                            cy={y} 
                            r={circleRadius} 
                            fill="#FFFFFF" 
                            stroke="#005F69" 
                            strokeWidth={strokeWidth}
                            initial={{ scale: 0, opacity: 0, transformOrigin: 'center' }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 + i * 0.1 }}
                        />
                    );
                })}
                </g>
            </svg>
        </div>
    </div>
  );
};

export default PersonalityRadarChart;