import React from 'react';
// FIX: Import Variants type from framer-motion to correctly type the variants object.
import { motion, Variants } from 'framer-motion';

interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
  title: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, title }) => {
  const maxValue = React.useMemo(() => {
    if (data.length === 0) return 10;
    return Math.max(...data.map(d => d.value), 10);
  }, [data]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const barVariants: Variants = {
    hidden: { height: 0, opacity: 0 },
    visible: (custom: { height: number; delay: number }) => ({
      height: `${custom.height}%`,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 12, delay: custom.delay },
    }),
  };

  return (
    <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm w-full h-80 flex flex-col">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-bold text-text-primary dark:text-dark-text-primary">{title}</h3>
        <div className="flex items-center ml-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="ml-2 text-xs font-semibold text-red-500 uppercase">LIVE</span>
        </div>
      </div>

      {data.length > 0 ? (
        <motion.div
          key={JSON.stringify(data)} // Re-trigger animation when data changes
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 flex justify-around items-end space-x-4"
        >
          {data.map((item, index) => {
            const heightPercentage = (item.value / maxValue) * 100;
            return (
              <div key={item.label} className="h-full flex-1 flex flex-col items-center justify-end group">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.4 }}
                  className="text-sm font-bold text-text-primary dark:text-dark-text-primary mb-1"
                >
                  {item.value}
                </motion.div>
                <motion.div
                  custom={{ height: heightPercentage, delay: index * 0.1 }}
                  variants={barVariants}
                  className="w-full bg-gradient-to-t from-primary to-primary/70 dark:from-primary-light dark:to-primary-light/70 rounded-t-lg group-hover:opacity-80 transition-opacity"
                  title={`${item.label}: ${item.value}`}
                />
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-2 text-center h-8 leading-tight line-clamp-2">
                  {item.label}
                </p>
              </div>
            );
          })}
        </motion.div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-secondary dark:text-dark-text-secondary">
          <p>Venter på data...</p>
        </div>
      )}
    </div>
  );
};

export default BarChart;