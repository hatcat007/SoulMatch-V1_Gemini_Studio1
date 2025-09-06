import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PersonalityTestProps {
    onTestComplete: () => void;
}

const questions = [
  { id: 1, text: "Jeg er ofte festens midtpunkt.", trait: "Extraversion" },
  { id: 2, text: "Jeg er meget opmærksom på detaljer.", trait: "Conscientiousness" },
  { id: 3, text: "Jeg føler andres følelser.", trait: "Agreeableness" },
  { id: 4, text: "Jeg bliver let stresset.", trait: "Neuroticism" },
  { id: 5, text: "Jeg har en livlig fantasi.", trait: "Openness" },
  { id: 6, text: "Jeg er stille omkring fremmede.", trait: "Extraversion", reversed: true },
  { id: 7, text: "Jeg efterlader ofte rod.", trait: "Conscientiousness", reversed: true },
  { id: 8, text: "Jeg er ikke særlig interesseret i andres problemer.", trait: "Agreeableness", reversed: true },
  { id: 9, text: "Jeg er afslappet det meste af tiden.", trait: "Neuroticism", reversed: true },
  { id: 10, text: "Jeg er ikke interesseret i abstrakte idéer.", trait: "Openness", reversed: true },
];

const PersonalityTest: React.FC<PersonalityTestProps> = ({ onTestComplete }) => {
    const { user } = useAuth();
    const [answers, setAnswers] = useState<{ [key: number]: number }>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnswer = (questionId: number, value: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            }
        }, 300);
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length !== questions.length) {
            setError("Besvar venligst alle spørgsmål.");
            return;
        }
        if (!user) {
             setError("Bruger ikke fundet. Prøv at logge ind igen.");
             return;
        }

        setIsSubmitting(true);
        setError(null);
        
        const scores: { [key: string]: number[] } = {
            Extraversion: [], Conscientiousness: [], Agreeableness: [], Neuroticism: [], Openness: []
        };

        questions.forEach(q => {
            let value = answers[q.id];
            if (q.reversed) {
                value = 6 - value;
            }
            scores[q.trait].push(value * 20); // Scale to 100
        });
        
        const finalTraits = Object.entries(scores).map(([trait, values]) => ({
            user_id: user.id,
            trait: trait,
            value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        }));
        
        try {
            // Clear old traits
            await supabase.from('user_traits').delete().eq('user_id', user.id);
            // Insert new traits
            const { error: insertError } = await supabase.from('user_traits').insert(finalTraits);
            if (insertError) throw insertError;

            // Mark test as completed
            const { error: updateUserError } = await supabase.from('users').update({ personality_test_completed: true }).eq('id', user.id);
            if (updateUserError) throw updateUserError;
            
            onTestComplete();
        } catch (err: any) {
            setError(err.message);
            setIsSubmitting(false);
        }
    };
    
    const progress = (currentQuestionIndex / questions.length) * 100;
    const isComplete = currentQuestionIndex === questions.length - 1 && answers[questions[currentQuestionIndex].id];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <AnimatePresence mode="wait">
                    {currentQuestionIndex < questions.length ? (
                        <motion.div
                            key={currentQuestionIndex}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-xl text-center">
                                <p className="text-sm font-semibold text-primary mb-2">Spørgsmål {currentQuestionIndex + 1} af {questions.length}</p>
                                <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-6">
                                    {questions[currentQuestionIndex].text}
                                </h2>
                                <div className="flex justify-between items-center text-sm text-text-secondary dark:text-dark-text-secondary mb-4">
                                    <span>Uenig</span>
                                    <span>Neutral</span>
                                    <span>Enig</span>
                                </div>
                                <div className="flex justify-between">
                                    {[1, 2, 3, 4, 5].map(value => (
                                        <button
                                            key={value}
                                            onClick={() => handleAnswer(questions[currentQuestionIndex].id, value)}
                                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all duration-200 ${answers[questions[currentQuestionIndex].id] === value ? 'bg-primary border-primary text-white scale-110' : 'bg-gray-200 dark:bg-dark-surface-light border-transparent hover:border-primary'}`}
                                        >
                                            {value}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                         <motion.div
                            key="completion"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                             <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-xl text-center">
                                <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Test Fuldført!</h2>
                                <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Tak fordi du tog testen. Dine resultater vil hjælpe os med at finde de bedste matches til dig.</p>
                                <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : 'Se mine matches'}
                                </button>
                                {error && <p className="text-red-500 mt-4">{error}</p>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <div className="mt-8">
                    <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2.5">
                        <motion.div
                            className="bg-primary h-2.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${isComplete ? 100 : progress}%` }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonalityTest;
