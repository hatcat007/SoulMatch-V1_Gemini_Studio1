import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Coffee, ChevronRight } from 'lucide-react';

const ChoiceCard: React.FC<{ to: string, icon: React.ReactNode, title: string, description: string }> = ({ to, icon, title, description }) => (
    <Link to={to} className="group block bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-transparent hover:border-primary">
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <div className="bg-primary-light dark:bg-primary/20 text-primary p-3 rounded-full mr-4">
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-text-primary dark:text-dark-text-primary">{title}</h3>
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{description}</p>
                </div>
            </div>
            <ChevronRight className="text-gray-400 group-hover:text-primary transition-colors" />
        </div>
    </Link>
);

const CreatePage: React.FC = () => {
    return (
        <div className="p-4 md:p-6 bg-gray-50 dark:bg-dark-background h-full flex flex-col items-center justify-center">
             <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Hvad vil du oprette?</h1>
                <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Vælg en måde at bringe folk sammen på.</p>
            </div>
            <div className="w-full max-w-lg space-y-4">
                <ChoiceCard 
                    to="/create-planned-event"
                    icon={<Calendar size={24} />}
                    title="Planlagt Event"
                    description="Opret et struktureret event med en fast tid og sted."
                />
                 <ChoiceCard 
                    to="/create-drop-in"
                    icon={<Coffee size={24} />}
                    title="Spontan Drop-in"
                    description="Lav en åben invitation til noget uformelt lige nu og her."
                />
            </div>
        </div>
    );
};

export default CreatePage;
