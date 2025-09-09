import React, { useState, useEffect, useMemo } from 'react';
import type { Interest, InterestCategory, PersonalityTag, PersonalityTagCategory } from '../types';
import { X, Search, ChevronDown, PlusCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TAGS_PER_PAGE = 20;

interface TagSelectorProps {
    title: string;
    categories: (InterestCategory | PersonalityTagCategory)[];
    allTags: (Interest | PersonalityTag)[];
    selectedTags: (Interest | PersonalityTag)[];
    onToggleTag: (tag: Interest | PersonalityTag) => void;
    goal?: number;
    containerHeight?: string;
    allowSuggestions?: boolean;
    onSuggestTag?: (tagName: string, categoryId: number) => Promise<Interest | PersonalityTag | null>;
}

const TagSelector: React.FC<TagSelectorProps> = ({ 
    title, categories, allTags, selectedTags, onToggleTag, goal, containerHeight = 'h-[500px]',
    allowSuggestions = false, onSuggestTag 
}) => {
    const [activeCategory, setActiveCategory] = useState<(InterestCategory | PersonalityTagCategory) | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(TAGS_PER_PAGE);
    const [isSuggesting, setIsSuggesting] = useState(false);

    useEffect(() => {
        if (!activeCategory && categories.length > 0) {
            setActiveCategory(categories[0]);
        }
    }, [categories, activeCategory]);

    const filteredTags = useMemo(() => {
        let tags = allTags;
        if (searchTerm) {
            tags = tags.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        } else if (activeCategory) {
            tags = tags.filter(i => i.category_id === activeCategory.id);
        }
        return tags;
    }, [allTags, activeCategory, searchTerm]);
    
    const handleSuggestTag = async () => {
        if (!onSuggestTag || !activeCategory || !searchTerm.trim()) return;
        
        setIsSuggesting(true);
        const newTag = await onSuggestTag(searchTerm.trim(), activeCategory.id);
        setIsSuggesting(false);

        if (newTag) {
            onToggleTag(newTag); // Automatically select the new tag
            setSearchTerm(''); // Clear search
        }
    };

    const progress = goal ? Math.min(100, (selectedTags.length / goal) * 100) : 0;

    return (
        <div className={`flex flex-col w-full ${containerHeight}`}>
            <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-3">{title}</h2>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-200 dark:border-dark-border rounded-lg p-3 overflow-hidden">
                <div className="col-span-1 flex flex-col space-y-1 overflow-y-auto pr-1 scrollbar-hide">
                    <div className="relative mb-1">
                        <input type="text" placeholder="Søg eller foreslå..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setVisibleCount(TAGS_PER_PAGE);}} className="w-full text-sm pl-8 pr-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-surface-light"/>
                        <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
                    </div>
                    {categories.map(cat => {
                        const count = selectedTags.filter(i => i.category_id === cat.id).length;
                        return (
                            <button key={cat.id} type="button" onClick={() => { setActiveCategory(cat); setSearchTerm(''); setVisibleCount(TAGS_PER_PAGE); }}
                                className={`w-full text-left text-sm font-semibold p-2 rounded-md flex justify-between items-center transition-colors ${activeCategory?.id === cat.id && !searchTerm ? 'bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-light'}`}>
                                <span>{cat.name}</span>
                                {count > 0 && <span className="bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{count}</span>}
                            </button>
                        );
                    })}
                </div>
                <div className="col-span-1 md:col-span-2 overflow-y-auto flex flex-wrap gap-2 content-start pr-1 scrollbar-hide">
                    {allowSuggestions && onSuggestTag && searchTerm.trim() && filteredTags.length === 0 && (
                         <motion.button 
                            type="button" 
                            onClick={handleSuggestTag}
                            disabled={isSuggesting}
                            className="w-full flex items-center justify-center p-3 rounded-lg bg-green-100 text-green-800 font-semibold hover:bg-green-200 transition-colors disabled:opacity-70"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                         >
                            {isSuggesting ? <Loader2 size={18} className="animate-spin mr-2" /> : <PlusCircle size={18} className="mr-2"/>}
                            {isSuggesting ? 'Tilføjer...' : `Foreslå "${searchTerm.trim()}"`}
                         </motion.button>
                    )}
                    <AnimatePresence>
                        {filteredTags.slice(0, visibleCount).map(tag => {
                            const isSelected = selectedTags.some(i => i.id === tag.id);
                            return (
                                <motion.button key={tag.id} type="button" onClick={() => onToggleTag(tag)}
                                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'bg-gray-100 dark:bg-dark-surface-light border-transparent hover:border-gray-300 dark:hover:border-dark-border'}`}>
                                    {tag.name}
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                    {visibleCount < filteredTags.length && (
                        <button type="button" onClick={() => setVisibleCount(c => c + TAGS_PER_PAGE)} className="w-full text-center text-sm font-semibold text-primary py-2 flex items-center justify-center">
                            Vis flere <ChevronDown size={16} className="ml-1"/>
                        </button>
                    )}
                </div>
            </div>
             <div className="flex-shrink-0 mt-2 p-2 bg-gray-50 dark:bg-dark-surface-light rounded-lg">
                <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-2">Valgte: {selectedTags.length}{goal && ` / ${goal}`}</p>
                    {goal && <p className="text-xs font-bold text-primary">{Math.round(progress)}%</p>}
                </div>
                {goal && <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-1.5 mb-2"><motion.div className="bg-primary h-1.5 rounded-full" animate={{ width: `${progress}%` }} /></div>}
                <div className="h-12 overflow-y-auto flex flex-wrap gap-1">
                    <AnimatePresence>
                    {selectedTags.map(tag => (
                        <motion.div key={tag.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                            className="flex items-center bg-primary text-white px-2 py-1 rounded-full text-xs">
                            <span>{tag.name}</span>
                            <button type="button" onClick={() => onToggleTag(tag)} className="ml-1.5 text-white/70 hover:text-white"><X size={12}/></button>
                        </motion.div>
                    ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default TagSelector;