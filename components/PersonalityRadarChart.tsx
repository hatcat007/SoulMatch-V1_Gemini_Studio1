import React from 'react';
import type { UserTrait } from '../types';

interface PersonalityRadarChartProps {
  traits: UserTrait[];
}

const PersonalityRadarChart: React.FC<PersonalityRadarChartProps> = ({ traits }) => {
  const size = 300;
  const center = size / 2;
  const numLevels = 5;
  const maxValue = 100;

  if (!traits || traits.length === 0) {
    return null;
  }
  
  const numAxes = traits.length;
  const angleSlice = (Math.PI * 2) / numAxes;

  // Calculate polygon points for the chart data
  const dataPoints = traits.map((trait, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const value = trait.value;
    const radius = (value / maxValue) * (center * 0.8);
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  // Calculate axis and label positions
  const axes = traits.map((trait, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const radius = center * 0.95;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return {
      x1: center,
      y1: center,
      x2: x,
      y2: y,
      label: trait.trait,
      labelX: center + (center * 1.05) * Math.cos(angle),
      labelY: center + (center * 1.05) * Math.sin(angle),
    };
  });

  return (
    <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm mb-6">
        <h3 className="font-bold text-text-primary dark:text-dark-text-primary mb-3 text-center">Personlighedsprofil</h3>
        <svg width="100%" height="auto" viewBox={`0 0 ${size} ${size}`}>
            {/* Grid Levels */}
            {Array.from({ length: numLevels }).map((_, levelIndex) => {
                const radius = ((levelIndex + 1) / numLevels) * (center * 0.8);
                const points = traits.map((_, i) => {
                    const angle = angleSlice * i - Math.PI / 2;
                    const x = center + radius * Math.cos(angle);
                    const y = center + radius * Math.sin(angle);
                    return `${x},${y}`;
                }).join(' ');
                return <polygon key={levelIndex} points={points} fill="none" stroke="#E5E7EB" strokeWidth="1" className="dark:stroke-gray-700" />;
            })}
            
            {/* Axes */}
            {axes.map((axis, i) => (
                <g key={i}>
                    <line x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="#E5E7EB" strokeWidth="1" className="dark:stroke-gray-700" />
                    <text
                        x={axis.labelX}
                        y={axis.labelY}
                        dy="0.35em"
                        textAnchor={axis.labelX > center + 1 ? 'start' : axis.labelX < center - 1 ? 'end' : 'middle'}
                        className="text-xs font-semibold fill-current text-gray-600 dark:text-gray-400"
                    >
                        {axis.label}
                    </text>
                </g>
            ))}

            {/* Data Polygon */}
            <polygon points={dataPoints} fill="rgba(0, 107, 118, 0.2)" stroke="#006B76" strokeWidth="2" />
            
            {/* Data Points */}
            {traits.map((trait, i) => {
                const angle = angleSlice * i - Math.PI / 2;
                const value = trait.value;
                const radius = (value / maxValue) * (center * 0.8);
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                return <circle key={i} cx={x} cy={y} r="4" fill="#006B76" />;
            })}
        </svg>
    </div>
  );
};

export default PersonalityRadarChart;
