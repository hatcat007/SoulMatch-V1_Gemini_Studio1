import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Category } from '../types';
import { ChevronDown } from 'lucide-react';

interface CategorySelectorProps {
    value: number | null;
    onChange: (categoryId: number) => void;
    type: 'event' | 'place';
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange, type }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [openMainCategory, setOpenMainCategory] = useState<number | null>(null);

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

    const mainCategories = categories.filter(c => c.parent_id === null);
    const subCategories = (parentId: number) => categories.filter(c => c.parent_id === parentId);

    const handleToggle = (mainCategoryId: number) => {
        setOpenMainCategory(prev => (prev === mainCategoryId ? null : mainCategoryId));
    };

    const handleSelectSubCategory = (subCategoryId: number) => {
        onChange(subCategoryId);
    };

    return (
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm w-full">
            <label className="block text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Kategori</label>
            <div className="space-y-2">
                {mainCategories.map(mainCat => (
                    <div key={mainCat.id} className="border-b border-gray-100 dark:border-dark-border last:border-b-0">
                        <button
                            type="button"
                            onClick={() => handleToggle(mainCat.id)}
                            className="w-full flex justify-between items-center py-3 text-left font-semibold text-text-primary dark:text-dark-text-primary"
                        >
                            {mainCat.name}
                            <ChevronDown className={`transition-transform ${openMainCategory === mainCat.id ? 'rotate-180' : ''}`} />
                        </button>
                        {openMainCategory === mainCat.id && (
                            <div className="pl-4 pb-2">
                                {subCategories(mainCat.id).map(subCat => (
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
                ))}
            </div>
        </div>
    );
};

export default CategorySelector;
