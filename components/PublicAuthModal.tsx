import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Zap, ArrowRight } from 'lucide-react';

const PublicAuthModal: React.FC = () => {
    const navigate = useNavigate();

    return (
        <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-white dark:bg-dark-surface rounded-2xl p-6 md:p-8 w-full max-w-lg text-center"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
            >
                <div className="mx-auto inline-block bg-primary-light dark:bg-primary/20 text-primary p-3 rounded-full mb-4">
                    <Lock size={32} />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-2">
                    🔒 Login som alle andre – med MitID 🙌
                </h2>
                <p className="text-text-secondary dark:text-dark-text-secondary mb-6">
                    For din og alles sikkerhed ❤️ I kampen mod ensomhed og for trygge møder i virkeligheden.
                </p>
                <p className="font-semibold text-text-primary dark:text-dark-text-primary mb-6">
                    👉 Et klik, et login – og du er klar til fællesskabet 🚀✨
                </p>
                
                <button
                    onClick={() => navigate('/login')}
                    className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg flex items-center justify-center"
                >
                    Fortsæt <ArrowRight size={20} className="ml-2" />
                </button>
                
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-border">
                    <div className="mx-auto inline-block bg-accent/10 text-accent p-3 rounded-full mb-4">
                        <Zap size={32} />
                    </div>
                     <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-2">
                        🧩 Tag personlighedstesten ✨
                    </h3>
                    <p className="text-text-secondary dark:text-dark-text-secondary">
                        Lær dig selv bedre at kende – og find ud af, hvordan du matcher med fællesskaber og aktiviteter, der giver mening for dig.
                    </p>
                    <p className="text-sm text-text-secondary/80 dark:text-dark-text-secondary/80 mt-4">
                        💡 Det tager kun få minutter, men kan åbne døren til venskaber, oplevelser og fællesskab i kampen mod ensomhed.
                    </p>
                    <p className="font-semibold text-text-primary dark:text-dark-text-primary mt-4">
                        👉 Klar? Lad os finde din vibe 🎯
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PublicAuthModal;
