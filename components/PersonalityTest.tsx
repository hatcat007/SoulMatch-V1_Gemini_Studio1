import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { usePersistentState } from '../hooks/useNotifications';
import { analyzePersonality } from '../services/geminiService';

interface PersonalityTestProps {
    onTestComplete: () => void;
}

const questions = [
    // Ekstrovert (Extraversion)
    { id: 1, text: "Jeg er ofte festens midtpunkt og nyder at være omgivet af mennesker.", dimension: "Extraversion" },
    { id: 2, text: "Jeg foretrækker rolige aftener alene eller med få nære venner frem for store sociale arrangementer.", dimension: "Extraversion", reversed: true },
    { id: 3, text: "Jeg starter let samtaler med fremmede.", dimension: "Extraversion" },
    { id: 4, text: "Jeg tænker mig grundigt om, før jeg taler eller handler.", dimension: "Extraversion", reversed: true },
    { id: 5, text: "Jeg føler mig energisk efter at have været social.", dimension: "Extraversion" },
    
    // Venlighed (Agreeableness)
    { id: 6, text: "Jeg har let ved at føle empati for andre.", dimension: "Agreeableness" },
    { id: 7, text: "Jeg er mere optaget af mine egne mål end af at hjælpe andre med deres.", dimension: "Agreeableness", reversed: true },
    { id: 8, text: "Jeg stoler på andre mennesker og tror på det bedste i dem.", dimension: "Agreeableness" },
    { id: 9, text: "Jeg er hurtig til at påpege andres fejl.", dimension: "Agreeableness", reversed: true },
    { id: 10, text: "Jeg prioriterer harmoni i grupper og undgår konfrontationer.", dimension: "Agreeableness" },

    // Samvittighedsfuldhed (Conscientiousness)
    { id: 11, text: "Jeg er meget organiseret og kan lide at have en plan.", dimension: "Conscientiousness" },
    { id: 12, text: "Jeg har en tendens til at udskyde opgaver.", dimension: "Conscientiousness", reversed: true },
    { id: 13, text: "Jeg er omhyggelig med mine pligter og fuldfører altid det, jeg starter.", dimension: "Conscientiousness" },
    { id: 14, text: "Jeg er spontan og foretrækker at holde mine muligheder åbne.", dimension: "Conscientiousness", reversed: true },
    { id: 15, text: "Jeg kan lide orden og rydder ofte op.", dimension: "Conscientiousness" },

    // Neuroticisme (Neuroticism)
    { id: 16, text: "Jeg bliver let bekymret og tænker meget over tingene.", dimension: "Neuroticism" },
    { id: 17, text: "Jeg er følelsesmæssigt stabil og bliver sjældent oprørt.", dimension: "Neuroticism", reversed: true },
    { id: 18, text: "Jeg oplever ofte humørsvingninger.", dimension: "Neuroticism" },
    { id: 19, text: "Jeg er generelt afslappet og bekymrer mig ikke meget.", dimension: "Neuroticism", reversed: true },
    { id: 20, text: "Jeg bliver let irriteret over småting.", dimension: "Neuroticism" },
];

const PersonalityTest: React.FC<PersonalityTestProps> = ({ onTestComplete }) => {
    const { user } = useAuth();
    const [answers, setAnswers] = usePersistentState<{[key: number]: number}>('personalityTestAnswers', {});
    const [currentQuestionIndex, setCurrentQuestionIndex] = usePersistentState('personalityTestIndex', 0);
    const [step, setStep] = useState<'intro' | 'questions' | 'submitting' | 'complete'>('intro');
    const [error, setError] = useState<string | null>(null);

    const hasSavedProgress = useMemo(() => Object.keys(answers).length > 0, [answers]);
    
    const handleAnswerChange = (value: number) => {
        const questionId = questions[currentQuestionIndex].id;
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };
    
    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const startTest = (resume: boolean) => {
        if (!resume) {
            setAnswers({});
            setCurrentQuestionIndex(0);
        }
        setStep('questions');
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length !== questions.length) {
            setError("Besvar venligst alle spørgsmål for det mest præcise resultat.");
            return;
        }
        if (!user) {
             setError("Bruger ikke fundet. Prøv at logge ind igen.");
             return;
        }

        setStep('submitting');
        setError(null);
        
        try {
            const answerData = questions.map(q => ({
                question: q.text,
                answer: answers[q.id], // 1-100 scale
                dimension: q.dimension,
                reversed: !!q.reversed,
            }));

            const { bio, interests, personality_tags } = user;
            
            const analysis = await analyzePersonality({
                answers: answerData,
                bio: bio || '',
                interests: interests || [],
                tags: personality_tags || [],
            });

            const finalTraits = Object.entries(analysis.scores).map(([trait, value]) => ({
                user_id: user.id,
                trait: trait,
                value: Math.round(value),
            }));

            // Clear old traits
            await supabase.from('user_traits').delete().eq('user_id', user.id);
            // Insert new traits
            const { error: insertError } = await supabase.from('user_traits').insert(finalTraits);
            if (insertError) throw insertError;

            // Mark test as completed and save personality type
            const { error: updateUserError } = await supabase.from('users')
                .update({ personality_test_completed: true, personality_type: analysis.personality_type.code })
                .eq('id', user.id);
            if (updateUserError) throw updateUserError;
            
            // Clear persisted state
            sessionStorage.removeItem('personalityTestAnswers');
            sessionStorage.removeItem('personalityTestIndex');

            setStep('complete');
            setTimeout(onTestComplete, 2000); // Show completion for a moment before finishing

        } catch (err: any) {
            setError(err.message);
            setStep('questions');
        }
    };
    
    const progress = (currentQuestionIndex / (questions.length -1)) * 100;
    const currentAnswer = answers[questions[currentQuestionIndex].id] ?? 50;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <AnimatePresence mode="wait">
                    {step === 'intro' && (
                         <motion.div
                            key="intro"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-xl text-center">
                                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Personlighedstest</h1>
                                <p className="text-text-secondary dark:text-dark-text-secondary mb-6">
                                    Denne test hjælper os med at finde de bedste matches til dig. Svar ærligt for det bedste resultat. Dine svar er private.
                                </p>
                                <div className="space-y-3">
                                    <button onClick={() => startTest(false)} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg">
                                        Start Test
                                    </button>
                                     {hasSavedProgress && (
                                        <button onClick={() => startTest(true)} className="w-full bg-primary-light text-primary font-bold py-3 px-4 rounded-full text-lg hover:bg-primary/20 transition duration-300">
                                            Fortsæt Test
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {step === 'questions' && (
                        <motion.div
                            key={currentQuestionIndex}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-xl">
                                <p className="text-sm font-semibold text-primary mb-2">Spørgsmål {currentQuestionIndex + 1} af {questions.length}</p>
                                <h2 className="text-xl md:text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-8 min-h-[6rem]">
                                    {questions[currentQuestionIndex].text}
                                </h2>
                                
                                <div className="relative mb-2 h-8">
                                    <div className="absolute transition-all duration-300" style={{ left: `calc(${currentAnswer}% - 20px)` }}>
                                        <div className="w-10 text-center">
                                            <span className="text-xs font-bold text-primary bg-primary-light dark:bg-primary/20 px-2 py-0.5 rounded-md">{currentAnswer}%</span>
                                            <div className="w-px h-2 bg-primary mx-auto"></div>
                                        </div>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={currentAnswer}
                                    onChange={(e) => handleAnswerChange(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none"
                                />

                                <div className="flex justify-between items-center text-sm text-text-secondary dark:text-dark-text-secondary mt-2">
                                    <span className="font-semibold">Uenig</span>
                                    <span className="font-semibold">Enig</span>
                                </div>
                                 <div className="flex justify-between items-center mt-6">
                                    <button onClick={handlePrev} disabled={currentQuestionIndex === 0} className="px-4 py-2 rounded-md font-semibold text-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-surface-light disabled:opacity-50">Tilbage</button>
                                     {currentQuestionIndex < questions.length - 1 ? (
                                        <button onClick={handleNext} className="px-6 py-2 rounded-full bg-primary text-white font-bold flex items-center">Næste <ArrowRight size={18} className="ml-2"/></button>
                                     ) : (
                                        <button onClick={handleSubmit} className="px-6 py-2 rounded-full bg-green-500 text-white font-bold">Fuldfør</button>
                                     )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {step === 'submitting' && (
                        <motion.div key="submitting" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                            <div className="text-center p-8">
                                <Loader2 className="animate-spin text-primary mx-auto" size={48} />
                                <p className="mt-4 font-semibold text-text-secondary dark:text-dark-text-secondary">Analyserer dine svar...</p>
                            </div>
                        </motion.div>
                    )}
                     {step === 'complete' && (
                        <motion.div key="completion" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                            <div className="text-center p-8">
                                <h2 className="text-2xl font-bold text-green-600 mb-4">Tak!</h2>
                                <p className="text-text-secondary dark:text-dark-text-secondary">Dine resultater er gemt.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {step === 'questions' && (
                    <div className="mt-8">
                        <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2.5">
                            <motion.div
                                className="bg-primary h-2.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonalityTest;