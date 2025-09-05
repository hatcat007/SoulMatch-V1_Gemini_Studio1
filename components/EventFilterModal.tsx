import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronDown, RotateCcw } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { Category } from '../types';

interface MainCategory extends Category {
    subCategories: Category[];
}

interface EventFilterModalProps {
  onClose: () => void;
  onApplyFilter: (categoryId: number | null) => void;
}

const EventFilterModal: React.FC<EventFilterModalProps> = ({ onClose, onApplyFilter }) => {
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
        onApplyFilter(categoryId);
    };

    const handleReset = () => {
        onApplyFilter(null);
    }

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
        <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-end md:items-center md:justify-center z-50 p-0 md:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.3 }}
        >
            <motion.div
                className="bg-white dark:bg-dark-surface rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex-shrink-0 z-10 p-4 border-b border-gray-200 dark:border-dark-border">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-8"></div> {/* Spacer for alignment */}
                        <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Find Events</h1>
                        <button onClick={onClose} className="p-2 -mr-2" aria-label="Close">
                            <X size={24} className="text-text-primary dark:text-dark-text-primary" />
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Søg i kategorier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-lg py-3 pl-10 pr-4 text-gray-700 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Search categories"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto px-4 py-2">
                    <div className="w-full bg-white dark:bg-dark-surface rounded-lg overflow-hidden">
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

                <footer className="p-4 border-t border-gray-200 dark:border-dark-border">
                    <button
                        onClick={handleReset}
                        className="w-full flex items-center justify-center bg-gray-100 dark:bg-dark-surface-light text-text-primary dark:text-dark-text-primary font-bold py-3 px-4 rounded-full text-lg hover:bg-gray-200 dark:hover:bg-dark-border transition duration-300"
                    >
                        <RotateCcw size={20} className="mr-2" />
                        Nulstil Filter
                    </button>
                </footer>
            </motion.div>
        </motion.div>
    );
};

export default EventFilterModal;
