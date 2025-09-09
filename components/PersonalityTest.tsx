import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, CheckCircle, Lock, Server } from 'lucide-react';
import { usePersistentState } from '../hooks/useNotifications';
import { analyzePersonality } from '../services/geminiService';
import SecurityPersonalityAnimation from './SecurityPersonalityAnimation';


interface PersonalityTestProps {
    onTestComplete: () => void;
}

const questions = [
    // E/I Dimension
    { id: 1, text: "Jeg får energi af at være sammen med andre mennesker.", dimension: "EI" },
    { id: 2, text: "Jeg foretrækker at lytte frem for at tale i en gruppesamtale.", dimension: "EI", reversed: true },
    { id: 3, text: "Jeg trives i livlige sociale situationer med mange nye ansigter.", dimension: "EI" },
    { id: 4, text: "Jeg har brug for alenetid for at genoplade mine batterier.", dimension: "EI", reversed: true },
    { id: 5, text: "Jeg er ofte den, der tager initiativ til at starte en samtale.", dimension: "EI" },
    
    // S/N Dimension
    { id: 6, text: "Jeg stoler mere på konkrete fakta og erfaringer end på teorier og ideer.", dimension: "SN" },
    { id: 7, text: "Jeg er mere interesseret i 'hvad der er' end 'hvad der kunne være'.", dimension: "SN" },
    { id: 8, text: "Jeg lægger mærke til små detaljer, som andre ofte overser.", dimension: "SN" },
    { id: 9, text: "Jeg dagdrømmer ofte om fremtiden og forskellige muligheder.", dimension: "SN", reversed: true },
    { id: 10, text: "Jeg foretrækker praktiske opgaver frem for abstrakte koncepter.", dimension: "SN" },

    // T/F Dimension
    { id: 11, text: "Når jeg træffer beslutninger, vægter jeg logik og objektivitet højest.", dimension: "TF" },
    { id: 12, text: "Jeg tager hensyn til andres følelser, før jeg træffer en beslutning, der påvirker dem.", dimension: "TF", reversed: true },
    { id: 13, text: "Jeg er mere tilbøjelig til at være ærlig end diplomatisk for at undgå at såre nogen.", dimension: "TF" },
    { id: 14, text: "Harmoni i gruppen er vigtigere for mig end at have ret.", dimension: "TF", reversed: true },
    { id: 15, text: "Jeg lader mig styre af mine principper frem for mine følelser.", dimension: "TF" },

    // J/P Dimension
    { id: 16, text: "Jeg kan lide at have en klar plan og følge den.", dimension: "JP" },
    { id: 17, text: "Jeg trives med spontanitet og kan ikke lide at være låst fast af en plan.", dimension: "JP", reversed: true },
    { id: 18, text: "Jeg kan lide at afslutte opgaver, før jeg slapper af.", dimension: "JP" },
    { id: 19, text: "Jeg holder mine muligheder åbne og kan lide at improvisere.", dimension: "JP", reversed: true },
    { id: 20, text: "Jeg er organiseret og kan lide at have styr på mine omgivelser.", dimension: "JP" },
];

const AnalysisAnimation = () => {
    const dimensions = ["EI", "SN", "TF", "JP"];
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-8">
            <div className="relative w-40 h-40">
                {/* Central Orb */}
                <motion.div
                    className="absolute top-1/2 left-1/2 w-16 h-16 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2"
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Orbiting Nodes */}
                {dimensions.map((dim, i) => (
                    <motion.div
                        key={dim}
                        className="absolute top-1/2 left-1/2 w-8 h-8 -m-4"
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 10 + i * 2,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    >
                        <motion.div
                            className="w-8 h-8 bg-primary-light dark:bg-primary/20 rounded-full flex items-center justify-center"
                            style={{ transform: `translateX(70px)` }}
                            animate={{ scale: [1, 0.8, 1] }}
                             transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.5
                            }}
                        >
                            <span className="font-bold text-xs text-primary">{dim}</span>
                        </motion.div>
                    </motion.div>
                ))}
                 {/* Particles */}
                {Array.from({ length: 4 }).map((_, i) => (
                     <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-primary rounded-full"
                        style={{
                            transformOrigin: '0 0'
                        }}
                        animate={{
                            x: [70, 0, 70],
                            y: [0, 0, 0],
                            scale: [1, 0.5, 1],
                            rotate: [i * 90, i * 90, i * 90]
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "linear",
                            delay: i * 0.6
                        }}
                    />
                ))}
            </div>
             <motion.p
                className="font-semibold text-text-secondary dark:text-dark-text-secondary text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                Analyserer dine svar...
            </motion.p>
        </div>
    );
};


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
                answer: answers[q.id],
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

            const finalDimensions = analysis.dimensions.map(dim => ({
                user_id: user.id,
                dimension: dim.dimension,
                dominant_trait: dim.dominant_trait,
                score: Math.round(dim.score),
                description: dim.description,
            }));

            // Clear old dimensions
            await supabase.from('user_personality_dimensions').delete().eq('user_id', user.id);
            // Insert new dimensions
            const { error: insertError } = await supabase.from('user_personality_dimensions').insert(finalDimensions);
            if (insertError) throw insertError;

            // Mark test as completed and save personality type
            const { error: updateUserError } = await supabase.from('users')
                .update({ personality_test_completed: true, personality_type: analysis.type_code })
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
                                <div className="flex justify-center mb-6">
                                    <SecurityPersonalityAnimation />
                                </div>
                                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Din Personlighedstest</h1>
                                <p className="text-text-secondary dark:text-dark-text-secondary mb-8">
                                    Dine svar hjælper vores AI med at finde de mest meningsfulde venskaber til dig.
                                </p>
                                
                                <div className="space-y-4 text-left text-sm mb-8">
                                    <div className="flex items-start space-x-3">
                                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-bold text-text-primary dark:text-dark-text-primary">Svar Ærligt</h3>
                                            <p className="text-text-secondary dark:text-dark-text-secondary">For det mest præcise resultat er det vigtigt, at du svarer ærligt ud fra, hvem du er.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <Lock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-bold text-text-primary dark:text-dark-text-primary">Dine Svar er Private</h3>
                                            <p className="text-text-secondary dark:text-dark-text-secondary">Dine specifikke svar bliver aldrig delt med andre brugere. Kun det endelige resultat vises på din profil.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <Server className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-bold text-text-primary dark:text-dark-text-primary">Sikker & Fortrolig Data</h3>
                                            <p className="text-text-secondary dark:text-dark-text-secondary">Al data gemmes fortroligt på GDPR-venlige servere i Schweiz med militær-grade end-to-end kryptering.</p>
                                        </div>
                                    </div>
                                </div>

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
                           <AnalysisAnimation />
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
                        {error && <p className="text-red-500 text-center text-sm mb-2">{error}</p>}
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