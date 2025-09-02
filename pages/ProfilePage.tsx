import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, MessageCircle } from 'lucide-react';
import NotificationIcon from '../components/NotificationIcon';

interface Trait {
  label: string;
  left: string;
  right: string;
  value: number; // 0 to 100
}

const mockTraits: Trait[] = [
  { label: 'Abstrakt opfattelse', left: '', right: '', value: 70 },
  { label: 'Emotionel tænkning', left: '', right: '', value: 80 },
  { label: 'Rationel tænkning', left: '', right: '', value: 40 },
  { label: 'Konkret opfattelse', left: '', right: '', value: 60 },
];

const TraitSlider: React.FC<{ trait: Trait }> = ({ trait }) => {
  const isBalanced = trait.value > 40 && trait.value < 60;
  return (
    <div className="mb-4">
        <div className="flex justify-between items-center mb-1 text-sm text-gray-600 dark:text-dark-text-secondary">
            <span>{trait.label}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-surface-light rounded-full h-2 relative">
             <div className="bg-gray-300 dark:bg-dark-border h-2 absolute top-0 left-1/2 w-px"></div>
             <div
                className={`h-2 rounded-full ${isBalanced ? 'bg-yellow-400' : trait.value > 50 ? 'bg-red-400' : 'bg-blue-400'}`}
                style={{ width: `${Math.abs(trait.value - 50)}%`, left: `${Math.min(trait.value, 50)}%` }}
            ></div>
        </div>
        <div className="flex justify-between items-center mt-1 text-xs text-gray-500 dark:text-dark-text-secondary/80">
            <span>{trait.value > 50 ? '' : 'Indadvendt'}</span>
            <span>{trait.value < 50 ? '' : 'Udadvendt'}</span>
        </div>
    </div>
  )
};

const ProfilePage: React.FC = () => {
  return (
    <div className="bg-gray-50 dark:bg-dark-background min-h-full">
      <div className="p-4 md:p-6 lg:max-w-6xl lg:mx-auto">
        <div className="flex justify-between items-center mb-4">
            <div className="w-10"></div> {/* Spacer */}
            <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
            <div className="flex items-center space-x-1">
                 <NotificationIcon />
                <button className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
                    <MessageCircle size={24}/>
                </button>
                <Link to="/settings" className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary">
                    <Settings size={24}/>
                </Link>
            </div>
        </div>
        
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-1 flex flex-col items-center text-center">
                <img 
                    src="https://picsum.photos/id/1011/120/120" 
                    alt="Anne Jensen" 
                    className="w-28 h-28 rounded-full border-4 border-white dark:border-dark-surface shadow-lg mb-3"
                />
                <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Anne Jensen 🛡️</h1>
                <p className="text-text-secondary dark:text-dark-text-secondary">Aalborg, Denmark</p>
                <p className="mt-2 max-w-xs text-text-secondary dark:text-dark-text-secondary">
                    Kreativt menneske som elsker film, gaming, katte og gåture. Lad os mødes til en god kaffe 😊
                </p>
                 <div className="flex justify-center space-x-4 my-6">
                    <div className="w-16 h-16 rounded-full bg-yellow-200 dark:bg-yellow-500/30 flex items-center justify-center text-3xl">😉</div>
                    <div className="w-16 h-16 rounded-full bg-red-200 dark:bg-red-500/30 flex items-center justify-center text-3xl">🎮</div>
                    <div className="w-16 h-16 rounded-full bg-blue-200 dark:bg-blue-500/30 flex items-center justify-center text-3xl">☕</div>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-3">Billeder som beskriver mig</h2>
                    <div className="grid grid-cols-3 gap-2">
                        <img src="https://picsum.photos/seed/cat/200/200" alt="cat" className="rounded-lg aspect-square object-cover"/>
                        <img src="https://picsum.photos/seed/gaming/200/200" alt="gaming" className="rounded-lg aspect-square object-cover"/>
                        <img src="https://picsum.photos/seed/coffee/200/200" alt="coffee" className="rounded-lg aspect-square object-cover"/>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-3">Personlighed</h2>
                    <p className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">INFJ</p>
                    {mockTraits.map(trait => <TraitSlider key={trait.label} trait={trait} />)}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;