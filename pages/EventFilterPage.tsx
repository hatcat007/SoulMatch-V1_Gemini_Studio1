import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { Category } from '../types';

interface MainCategory extends Category {
    subCategories: Category[];
}

const EventFilterPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategory, setOpenCategory] = useState<number | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('type', 'event')
            .order('name', { ascending: true });
        
        if (error) {
            console.error('Error fetching categories:', error);
        } else {
            const mainCategories = data.filter(c => c.parent_id === null);
            const subCategories = data.filter(c => c.parent_id !== null);
            
            const structuredCategories = mainCategories.map(main => ({
                ...main,
                subCategories: subCategories.filter(sub => sub.parent_id === main.id)
            }));
            setCategories(structuredCategories);
        }
    };
    fetchCategories();
  }, []);

  const handleSelectCategory = (categoryId: number) => {
    navigate(`/home?category_id=${categoryId}`);
  };

  const filteredCategories = categories.map(mainCat => ({
    ...mainCat,
    subCategories: mainCat.subCategories.filter(subCat => 
      subCat.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(mainCat => 
      mainCat.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      mainCat.subCategories.length > 0
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
      <header className="flex-shrink-0 z-10 p-4 md:max-w-3xl md:mx-auto md:w-full">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2" aria-label="Go back">
            <ArrowLeft size={24} className="text-text-primary dark:text-dark-text-primary" />
          </button>
          <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Find Events</h1>
          <div className="w-8"></div> {/* Spacer for alignment */}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Søg i kategorier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-lg py-3 pl-10 pr-4 text-gray-700 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Search categories"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto px-4 py-2 md:max-w-3xl md:mx-auto md:w-full">
        <div className="w-full bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden">
          {filteredCategories.map(mainCat => (
            <div key={mainCat.id} className="border-b border-gray-100 dark:border-dark-border last:border-b-0">
              <button
                onClick={() => setOpenCategory(openCategory === mainCat.id ? null : mainCat.id)}
                className="w-full flex justify-between items-center text-left p-4 hover:bg-gray-50 dark:hover:bg-dark-surface-light"
              >
                <span className="text-lg font-bold text-text-primary dark:text-dark-text-primary">{mainCat.name}</span>
                <ChevronDown className={`transition-transform ${openCategory === mainCat.id ? 'rotate-180' : ''}`} />
              </button>
              {openCategory === mainCat.id && (
                <div className="pl-6 pr-4 pb-2">
                  {mainCat.subCategories.map(subCat => (
                    <button
                      key={subCat.id}
                      onClick={() => handleSelectCategory(subCat.id)}
                      className="w-full text-left py-2 px-2 text-md text-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border rounded-md"
                    >
                      {subCat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default EventFilterPage;