import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Sun, Moon, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabase';
import type { Category, Interest } from '../types';

export interface Filters {
    categoryId: number | null;
    date: string | null;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | null;
    interestIds: number[];
    creatorType: 'all' | 'user' | 'org';
}

interface EventFilterModalProps {
    onClose: () => void;
    onApplyFilter: (filters: Filters) => void;
    currentFilters: Filters;
}

const EventFilterModal: React.FC<EventFilterModalProps> = ({ onClose, onApplyFilter, currentFilters }) => {
    const [filters, setFilters] = useState<Filters>(currentFilters);
    const [categories, setCategories] = useState<Category[]>([]);
    const [interests, setInterests] = useState<Interest[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            const { data: catData } = await supabase.from('categories').select('*').eq('type', 'event').not('parent_id', 'is', null);
            if (catData) setCategories(catData);

            const { data: intData } = await supabase.from('interests').select('*').order('name');
            if (intData) setInterests(intData);
        };
        fetchData();
    }, []);
    
    const handleApply = () => {
        onApplyFilter(filters);
    };
    
    const handleReset = () => {
        const resetFilters = {
            categoryId: null,
            date: null,
            timeOfDay: null,
            interestIds: [],
            creatorType: 'all' as const
        };
        setFilters(resetFilters);
        onApplyFilter(resetFilters);
    };

    const handleInterestToggle = (id: number) => {
        setFilters(prev => {
            const newIds = prev.interestIds.includes(id)
                ? prev.interestIds.filter(i => i !== id)
                : [...prev.interestIds, id];
            return { ...prev, interestIds: newIds };
        });
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center md:justify-center z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-white dark:bg-dark-surface w-full md:max-w-lg rounded-t-3xl md:rounded-2xl max-h-[90vh] flex flex-col"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
                    <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary flex items-center">
                        <SlidersHorizontal className="mr-2" />
                        Filtrer Events
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-light">
                        <X size={24} />
                    </button>
                </header>

                <main className="overflow-y-auto p-6 space-y-6">
                    {/* Date */}
                    <div>
                        <label htmlFor="date" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Vælg dato</label>
                        <input
                            type="date"
                            id="date"
                            min={today}
                            value={filters.date || ''}
                            onChange={(e) => setFilters(p => ({ ...p, date: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    
                    {/* Time of Day */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Tidspunkt på dagen</label>
                        <div className="grid grid-cols-3 gap-2">
                             <button type="button" onClick={() => setFilters(p => ({...p, timeOfDay: 'morning'}))} className={`p-3 rounded-lg border-2 flex flex-col items-center ${filters.timeOfDay === 'morning' ? 'border-primary bg-primary-light dark:bg-primary/20' : 'bg-gray-50 dark:bg-dark-surface-light hover:border-gray-300 dark:hover:border-dark-border'}`}><Coffee size={20} className="mb-1"/> <span className="text-xs font-semibold">Formiddag</span></button>
                             <button type="button" onClick={() => setFilters(p => ({...p, timeOfDay: 'afternoon'}))} className={`p-3 rounded-lg border-2 flex flex-col items-center ${filters.timeOfDay === 'afternoon' ? 'border-primary bg-primary-light dark:bg-primary/20' : 'bg-gray-50 dark:bg-dark-surface-light hover:border-gray-300 dark:hover:border-dark-border'}`}><Sun size={20} className="mb-1"/> <span className="text-xs font-semibold">Eftermiddag</span></button>
                             <button type="button" onClick={() => setFilters(p => ({...p, timeOfDay: 'evening'}))} className={`p-3 rounded-lg border-2 flex flex-col items-center ${filters.timeOfDay === 'evening' ? 'border-primary bg-primary-light dark:bg-primary/20' : 'bg-gray-50 dark:bg-dark-surface-light hover:border-gray-300 dark:hover:border-dark-border'}`}><Moon size={20} className="mb-1"/> <span className="text-xs font-semibold">Aften</span></button>
                        </div>
                    </div>
                    
                    {/* Category */}
                    <div>
                        <label htmlFor="category" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Kategori</label>
                        <select
                            id="category"
                            value={filters.categoryId || ''}
                            onChange={(e) => setFilters(p => ({...p, categoryId: e.target.value ? Number(e.target.value) : null}))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                        >
                            <option value="">Alle kategorier</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>

                    {/* Creator Type */}
                     <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Oprettet af</label>
                         <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => setFilters(p => ({...p, creatorType: 'all'}))} className={`p-2 rounded-lg border-2 text-sm font-semibold ${filters.creatorType === 'all' ? 'border-primary bg-primary-light dark:bg-primary/20' : 'bg-gray-50 dark:bg-dark-surface-light hover:border-gray-300 dark:hover:border-dark-border'}`}>Alle</button>
                            <button type="button" onClick={() => setFilters(p => ({...p, creatorType: 'user'}))} className={`p-2 rounded-lg border-2 text-sm font-semibold ${filters.creatorType === 'user' ? 'border-primary bg-primary-light dark:bg-primary/20' : 'bg-gray-50 dark:bg-dark-surface-light hover:border-gray-300 dark:hover:border-dark-border'}`}>Brugere</button>
                            <button type="button" onClick={() => setFilters(p => ({...p, creatorType: 'org'}))} className={`p-2 rounded-lg border-2 text-sm font-semibold ${filters.creatorType === 'org' ? 'border-primary bg-primary-light dark:bg-primary/20' : 'bg-gray-50 dark:bg-dark-surface-light hover:border-gray-300 dark:hover:border-dark-border'}`}>Organisationer</button>
                        </div>
                    </div>
                    
                    {/* Interests */}
                    <div>
                         <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Interesser</label>
                         <div className="max-h-40 overflow-y-auto flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-dark-surface-light rounded-lg">
                            {interests.map(interest => (
                                <button
                                    key={interest.id}
                                    type="button"
                                    onClick={() => handleInterestToggle(interest.id)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 ${filters.interestIds.includes(interest.id) ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-dark-surface border-transparent hover:border-gray-300 dark:hover:border-dark-border'}`}
                                >
                                    {interest.name}
                                </button>
                            ))}
                         </div>
                    </div>
                </main>

                <footer className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-dark-border flex-shrink-0">
                    <button onClick={handleReset} className="font-bold text-text-secondary dark:text-dark-text-secondary hover:underline">Nulstil</button>
                    <button onClick={handleApply} className="bg-primary text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-primary-dark transition-colors">
                        Vis resultater
                    </button>
                </footer>
            </motion.div>
        </motion.div>
    );
};

export default EventFilterModal;
