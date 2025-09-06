import React from 'react';
import type { UserTrait } from '../types';
import { motion } from 'framer-motion';

interface PersonalityRadarChartProps {
  traits: UserTrait[];
}

const PersonalityRadarChart: React.FC<PersonalityRadarChartProps> = ({ traits }) => {
  const size = 380; // Increased size for more padding
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

  // Calculate axis and label positions
  const axes = orderedTraits.map((trait, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x = center + center * Math.cos(angle);
    const y = center + center * Math.sin(angle);
    
    // Add more padding for labels
    const labelRadius = center * 0.9;
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

  return (
    <div className="w-full h-full flex items-center justify-center">
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
            <g transform={`translate(0, 20)`}> {/* Add top margin */}
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
                    let dy = "0.35em";
                    if (axis.labelY < size * 0.2) dy = "1.5em"; // Push top label down
                    if (axis.labelY > size * 0.8) dy = "-0.5em"; // Push bottom labels up

                    return (
                        <g key={i}>
                            <line x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="#E5E7EB" strokeWidth="1" className="dark:stroke-dark-border" />
                            <text x={axis.labelX} y={axis.labelY} dy={dy} textAnchor={textAnchor} className="text-sm font-bold fill-current text-text-primary dark:text-dark-text-primary">
                                {axis.label}
                            </text>
                             <text x={axis.labelX} y={axis.labelY} dy={parseFloat(dy) + 1.2 + 'em'} textAnchor={textAnchor} className="text-xs font-semibold fill-current text-text-secondary dark:text-dark-text-secondary">
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
                    strokeWidth="2.5"
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
                            r="5" 
                            fill="#FFFFFF" 
                            stroke="#005F69" 
                            strokeWidth="2.5"
                            initial={{ scale: 0, opacity: 0, transformOrigin: 'center' }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 + i * 0.1 }}
                        />
                    );
                })}
            </g>
        </svg>
    </div>
  );
};

export default PersonalityRadarChart;