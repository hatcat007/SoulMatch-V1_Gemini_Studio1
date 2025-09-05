import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import type { Category } from '../types';
import { ChevronDown, Search } from 'lucide-react';

interface CategorySelectorProps {
    value: number | null;
    onChange: (categoryId: number) => void;
    type: 'event' | 'place';
}

interface MainCategoryWithSubs extends Category {
    subCategories: Category[];
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange, type }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [openMainCategory, setOpenMainCategory] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('type', type);

            if (error) {
                console.error(`Error fetching ${type} categories:`, error);
            } else {
                setCategories(data || []);
            }
        };
        fetchCategories();
    }, [type]);
    
    const structuredCategories = useMemo<MainCategoryWithSubs[]>(() => {
        const main = categories.filter(c => c.parent_id === null).sort((a,b) => a.name.localeCompare(b.name));
        const sub = categories.filter(c => c.parent_id !== null).sort((a,b) => a.name.localeCompare(b.name));
        return main.map(m => ({
            ...m,
            subCategories: sub.filter(s => s.parent_id === m.id)
        }));
    }, [categories]);

    const filteredCategories = useMemo<MainCategoryWithSubs[]>(() => {
        if (!searchTerm.trim()) {
            return structuredCategories;
        }

        const lowercasedSearchTerm = searchTerm.toLowerCase();

        return structuredCategories
            .map(mainCat => {
                const matchingSubs = mainCat.subCategories.filter(subCat =>
                    subCat.name.toLowerCase().includes(lowercasedSearchTerm)
                );
                return { ...mainCat, subCategories: matchingSubs };
            })
            .filter(mainCat =>
                mainCat.name.toLowerCase().includes(lowercasedSearchTerm) ||
                mainCat.subCategories.length > 0
            );
    }, [structuredCategories, searchTerm]);


    const handleToggle = (mainCategoryId: number) => {
        // Disable manual toggle when a search is active
        if (searchTerm.trim()) return;
        setOpenMainCategory(prev => (prev === mainCategoryId ? null : mainCategoryId));
    };

    const handleSelectSubCategory = (subCategoryId: number) => {
        onChange(subCategoryId);
    };

    return (
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm w-full">
            <label className="block text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Kategori</label>
            
            <div className="relative mb-3">
                <input
                    type="text"
                    placeholder="Søg i kategorier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg py-2 pl-10 pr-4 text-gray-700 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredCategories.map(mainCat => {
                    const isOpen = searchTerm.trim() || openMainCategory === mainCat.id;

                    return (
                        <div key={mainCat.id} className="border-b border-gray-100 dark:border-dark-border last:border-b-0">
                            <button
                                type="button"
                                onClick={() => handleToggle(mainCat.id)}
                                className="w-full flex justify-between items-center py-3 text-left font-semibold text-text-primary dark:text-dark-text-primary"
                            >
                                {mainCat.name}
                                <ChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && (
                                <div className="pl-4 pb-2">
                                    {mainCat.subCategories.map(subCat => (
                                        <button
                                            key={subCat.id}
                                            type="button"
                                            onClick={() => handleSelectSubCategory(subCat.id)}
                                            className={`w-full text-left p-2 rounded-md transition-colors ${value === subCat.id ? 'bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light font-bold' : 'hover:bg-gray-50 dark:hover:bg-dark-surface-light'}`}
                                        >
                                            {subCat.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CategorySelector;