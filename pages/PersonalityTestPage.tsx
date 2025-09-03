

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { analyzePersonality } from '../services/geminiService';
import type { User, Interest } from '../types';
import { BrainCircuit, Loader, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';

interface PersonalityTestPageProps {
    onTestComplete: () => void;
}

const shortTestQuestions = [
    'Du foretrækker ofte at være alene frem for i store grupper.',
    'Du er mere optaget af, hvad der er virkeligt, end hvad der er muligt.',
    'Dine følelser styrer ofte dine beslutninger.',
    'Du kan lide at have en plan og holde dig til den.',
    'Du finder det let at starte en samtale med fremmede.',
];

const longTestQuestions = [
    ...shortTestQuestions,
    'Du tænker ofte over meningen med livet.',
    'For dig er det vigtigere at være logisk end at være venlig.',
    'Du kan lide at holde dine muligheder åbne i stedet for at lægge en fast plan.',
    'Du bliver ofte energisk efter at have tilbragt tid med andre mennesker.',
    'Du stoler mere på din erfaring end din fantasi.',
];

const PersonalityTestPage: React.FC<PersonalityTestPageProps> = ({ onTestComplete }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [interests, setInterests] = useState<Interest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSkipping, setIsSkipping] = useState(false);
    const [step, setStep] = useState<'selection' | 'testing' | 'analyzing' | 'complete'>('selection');
    const [questions, setQuestions] = useState<string[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [analysisLog, setAnalysisLog] = useState<string[]>([]);
    const analysisLogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) { navigate('/login'); return; }

            const { data: profileData, error: profileError } = await supabase.from('users').select('*').eq('auth_id', authUser.id).single();
            if (profileError || !profileData) { navigate('/create-profile'); return; }
            setUser(profileData);

            const { data: interestData, error: interestError } = await supabase
                .from('user_interests')
                .select('interest:interests(*)')
                .eq('user_id', profileData.id);

            if (!interestError && interestData) {
                setInterests(interestData.map((item: any) => item.interest));
            }

            setIsLoading(false);
        };
        fetchData();
    }, [navigate]);
    
    useEffect(() => {
        if (analysisLogRef.current) {
            analysisLogRef.current.scrollTop = analysisLogRef.current.scrollHeight;
        }
    }, [analysisLog]);


    const handleStartTest = (testType: 'short' | 'long') => {
        const selectedQuestions = testType === 'short' ? shortTestQuestions : longTestQuestions;
        setQuestions(selectedQuestions);
        setAnswers(new Array(selectedQuestions.length).fill(50)); // Default answers to neutral (50)
        setCurrentQuestionIndex(0);
        setStep('testing');
    };
    
    const handleAnswerChange = (value: number) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = value;
        setAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleFinishTest = async () => {
        if (!user) return;
        setStep('analyzing');
        setAnalysisLog([]);
        setError(null);

        const formattedAnswers = questions.map((q, i) => ({ question: q, answer: answers[i] }));
        const testType = questions.length > shortTestQuestions.length ? 'long' : 'short';

        const onThinkingUpdate = (update: string) => {
            setAnalysisLog(prev => [...prev, update]);
        };

        try {
            const result = await analyzePersonality(user, interests, testType, formattedAnswers, onThinkingUpdate);
            
            const { error: traitsError } = await supabase.from('user_traits').upsert(
                result.traits.map(t => ({ user_id: user.id, trait: t.trait, value: t.value })),
                { onConflict: 'user_id,trait' }
            );
            if (traitsError) throw traitsError;

            const { error: userUpdateError } = await supabase.from('users').update({
                personality_type: result.personality_type,
                personality_test_completed: true,
            }).eq('id', user.id);
            if (userUpdateError) throw userUpdateError;

            setStep('complete');
            // Calling onTestComplete immediately makes the state flow more robust.
            // App.tsx will handle the navigation/re-render, and this component will show the 'complete'
            // UI until it gets unmounted.
            onTestComplete();

        } catch (err: any) {
            setError(`Der skete en fejl under analysen: ${err.message}`);
            setStep('testing');
        }
    };
    
    const handleSkipTest = async () => {
        if (!user) return;
        setIsSkipping(true);
        setError(null);

        const { error: userUpdateError } = await supabase
            .from('users')
            .update({ personality_test_completed: true })
            .eq('id', user.id);

        if (userUpdateError) {
            setError(`Kunne ikke opdatere profil: ${userUpdateError.message}`);
            setIsSkipping(false);
        } else {
            onTestComplete();
        }
    };

    if (isLoading) {
        return <div className="p-4 text-center">Indlæser profil...</div>;
    }
    
    const renderContent = () => {
        switch (step) {
            case 'testing':
                const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
                return (
                     <div key="testing" className="w-full max-w-xl mx-auto h-full flex flex-col justify-between p-4">
                         <div>
                            <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2 my-4">
                                <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-8">Spørgsmål {currentQuestionIndex + 1} af {questions.length}</p>
                            <h3 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary min-h-[6rem]">{questions[currentQuestionIndex]}</h3>
                         </div>
                        
                         <div className="my-8">
                             <input
                                type="range"
                                min="0" max="100"
                                value={answers[currentQuestionIndex]}
                                onChange={(e) => handleAnswerChange(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-xs text-text-secondary dark:text-dark-text-secondary mt-2">
                                <span>Uenig</span>
                                <span>Neutral</span>
                                <span>Enig</span>
                            </div>
                         </div>

                        <div className="flex justify-between items-center">
                             <button onClick={handleBack} disabled={currentQuestionIndex === 0} className="p-3 rounded-full bg-gray-200 dark:bg-dark-surface-light text-gray-700 dark:text-dark-text-primary disabled:opacity-50">
                                <ArrowLeft size={24}/>
                            </button>
                             {currentQuestionIndex < questions.length - 1 ? (
                                <button onClick={handleNext} className="bg-primary text-white font-bold py-3 px-8 rounded-full text-lg">
                                    Næste
                                </button>
                             ) : (
                                <button onClick={handleFinishTest} className="bg-green-500 text-white font-bold py-3 px-8 rounded-full text-lg">
                                    Færdig
                                </button>
                             )}
                             <div className="w-12 h-12"></div>
                        </div>
                    </div>
                );
            
            case 'analyzing':
                return (
                     <div key="analyzing-log" className="w-full max-w-xl mx-auto text-left p-4">
                        <h3 className="text-2xl font-bold text-center mb-4 text-text-primary dark:text-dark-text-primary">Analyserer din personlighed...</h3>
                        <div className="font-mono bg-gray-800 text-white p-4 rounded-lg shadow-lg h-64 flex flex-col">
                            <div className="flex items-center border-b border-gray-600 pb-2 mb-2 flex-shrink-0">
                                <span className="w-3 h-3 bg-red-500 rounded-full mr-1.5"></span>
                                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-1.5"></span>
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                <span className="ml-auto text-xs text-gray-400">AI Analysis Log</span>
                            </div>
                            <div ref={analysisLogRef} className="overflow-y-auto flex-1 text-sm text-green-300 whitespace-pre-wrap">
                                {analysisLog.join('')}
                                <span className="inline-block w-2 h-4 bg-green-300 animate-pulse ml-1" />
                            </div>
                        </div>
                    </div>
                );
            case 'complete':
                 return (
                    <div key="complete-state" className="p-4">
                        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Analyse Fuldført!</h3>
                        <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Du bliver nu sendt videre...</p>
                    </div>
                );

            case 'selection':
            default:
                 return (
                     <div key="selection" className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-12 p-8">
                        {/* Left Decorative Panel */}
                        <div className="hidden lg:flex flex-col items-center justify-center text-center">
                            <div className="mx-auto bg-primary-light dark:bg-primary/20 text-primary dark:text-primary-light p-5 rounded-full mb-6">
                                <BrainCircuit size={64} strokeWidth={1.5} />
                            </div>
                            <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-3">Personlighedstest</h2>
                            <p className="text-text-secondary dark:text-dark-text-secondary max-w-sm mx-auto">
                                Vores AI analyserer dine informationer for at finde de bedste soulmates til dig.
                            </p>
                        </div>
                        {/* Right Action Panel */}
                        <div className="w-full max-w-sm mx-auto text-center">
                            <div className="lg:hidden">
                                <div className="mx-auto inline-block bg-primary-light dark:bg-primary/20 text-primary dark:text-primary-light p-5 rounded-full mb-6">
                                    <BrainCircuit size={48} strokeWidth={1.5} />
                                </div>
                                <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-3">Tag en personlighedstest</h2>
                                <p className="text-text-secondary dark:text-dark-text-secondary mb-10 max-w-sm mx-auto">
                                    Vores AI analyserer dine informationer for at finde de bedste soulmates til dig.
                                </p>
                            </div>
                            {error && <p className="text-red-500 bg-red-100 dark:bg-red-500/10 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</p>}
                            <div className="space-y-4">
                                <button onClick={() => handleStartTest('short')} className="w-full bg-primary text-white font-bold py-4 rounded-full text-lg hover:bg-primary-dark transition shadow-lg">
                                    Tag den hurtige test
                                </button>
                                <button onClick={() => handleStartTest('long')} className="w-full bg-primary-light dark:bg-dark-surface-light text-primary dark:text-dark-text-primary font-bold py-4 rounded-full text-lg hover:bg-primary/20 dark:hover:bg-dark-border transition">
                                    Tag den lange og præcise
                                </button>
                                <button 
                                    onClick={handleSkipTest} 
                                    disabled={isSkipping}
                                    className="w-full text-text-secondary dark:text-dark-text-secondary font-semibold py-3 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-dark-surface-light transition disabled:opacity-50"
                                >
                                    {isSkipping ? <Loader className="animate-spin inline-block" /> : 'Spring test over (Anbefales IKKE)'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
        }
    };


    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-background">
            <header className="flex-shrink-0 p-6 self-center">
                <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
            </header>
            
            <main className="flex-1 flex flex-col items-center justify-center">
                {renderContent()}
            </main>
        </div>
    );
};

export default PersonalityTestPage;
