
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';

interface Category {
  name: string;
  emoji: string;
}

const categories: Category[] = [
  { name: 'Mad', emoji: '🍔' },
  { name: 'Events', emoji: '🎉' },
  { name: 'Kultur', emoji: '🎨' },
  { name: 'Brætspil', emoji: '🎲' },
  { name: 'Biograf', emoji: '🎬' },
  { name: 'Gåtur', emoji: '🚶‍♀️' },
  { name: 'Gaming', emoji: '🎮' },
  { name: 'Træning', emoji: '💪' },
  { name: 'Fest', emoji: '🥳' },
];

const EventFilterPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectCategory = (categoryName: string) => {
    navigate(`/home?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="flex-shrink-0 z-10 p-4 md:max-w-3xl md:mx-auto md:w-full">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2" aria-label="Go back">
            <ArrowLeft size={24} className="text-text-primary" />
          </button>
          <h1 className="text-2xl font-bold text-text-primary">SoulMatch</h1>
          <div className="w-8"></div> {/* Spacer for alignment */}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Søg på dine interesser eller ønsker"
            className="w-full bg-gray-100 border border-gray-200 rounded-lg py-3 pl-10 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Search interests"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
      </header>
      
      <div className="flex-1 flex flex-col items-center px-4 md:max-w-3xl md:mx-auto md:w-full">
        <div className="w-10 h-1.5 bg-gray-300 rounded-full my-4 md:hidden"></div>
         <button onClick={() => navigate('/home')} className="self-start p-2 -ml-2 mb-4 md:hidden" aria-label="Go back to all events">
            <ArrowLeft size={24} className="text-text-primary" />
         </button>

        <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => handleSelectCategory(category.name)}
              className="aspect-square bg-primary text-white rounded-full flex flex-col items-center justify-center p-2 text-center hover:bg-primary-dark transition-colors duration-200 shadow-md"
            >
              <span className="text-3xl">{category.emoji}</span>
              <span className="font-bold text-sm mt-1">{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventFilterPage;
