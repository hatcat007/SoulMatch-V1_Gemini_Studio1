import React from 'react';

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
    if (data.length === 0) return 1; // Avoid division by zero
    return Math.max(...data.map(d => d.value), 1);
  }, [data]);

  return (
    <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm w-full">
      <h3 className="text-md font-bold text-text-primary dark:text-dark-text-primary mb-4">{title}</h3>
      {data.length > 0 ? (
        <div className="flex justify-around items-end h-48 space-x-2">
          {data.map(item => (
            <div key={item.label} className="flex-1 flex flex-col items-center justify-end">
              <div
                className="w-full bg-primary-light dark:bg-primary/20 rounded-t-md hover:bg-primary/40 transition-colors"
                style={{ height: `${(item.value / maxValue) * 100}%` }}
                title={`${item.label}: ${item.value}`}
              >
                 <div className="text-center text-xs font-bold text-primary-dark dark:text-primary-light pt-1">{item.value}</div>
              </div>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-2 text-center truncate w-full">{item.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 text-text-secondary dark:text-dark-text-secondary">
          <p>Ingen data at vise.</p>
        </div>
      )}
    </div>
  );
};

export default BarChart;
