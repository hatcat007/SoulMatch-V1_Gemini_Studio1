
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Edit, LogOut, Sun, Moon, Heart, BrainCircuit, Users, Award, Trash2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import type { User, Interest, PersonalityTag, UserAiDescription } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import { fetchPrivateFile } from '../services/s3Service';
import PersonalityDimensionChart from '../components/PersonalityDimensionChart';
import { motion, AnimatePresence } from 'framer-motion';
import { generateProfileDescription } from '../services/geminiService';

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            fetchPrivateFile(src).then(url => {
                objectUrl = url;
                setImageUrl(url);
            });
        }
        return () => {
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    if (!imageUrl) return <div className={`${className} bg-gray-200 animate-pulse`} />;
    return <img src={imageUrl} alt={alt} className={className} />;
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, refetchUserProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'about' | 'personality' | 'interests'>('about');
  
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [aiDescriptions, setAiDescriptions] = useState<UserAiDescription[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullUserData = async () => {
      if (user) {
        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('*, interests(*), personality_tags(*), personality_dimensions:user_personality_dimensions(*)')
            .eq('id', user.id)
            .single();
        
        const { data: aiDescData, error: aiDescError } = await supabase
            .from('user_ai_descriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (aiDescError) console.error("Error fetching AI descriptions:", aiDescError);
        else setAiDescriptions(aiDescData || []);
        
        if (error) {
            console.error("Error fetching full user profile:", error);
        } else if (data) {
            setFullUser(data as User);
        }
        setLoading(false);
      } else if (!authLoading) {
         setLoading(false);
      }
    };
    fetchFullUserData();
  }, [user, authLoading]);

  const handleGenerateDescription = async () => {
    if (!fullUser) return;
    setIsGenerating(true);
    try {
        const description = await generateProfileDescription({
            bio: fullUser.bio || '',
            personality_type: fullUser.personality_type || '',
            dimensions: fullUser.personality_dimensions || [],
            interests: fullUser.interests || [],
            tags: fullUser.personality_tags || [],
        });
        
        const { data: newDesc, error } = await supabase
            .from('user_ai_descriptions')
            .insert({ user_id: fullUser.id, description })
            .select()
            .single();

        if (error) throw error;
        
        setAiDescriptions(prev => [newDesc, ...prev]);

    } catch (e: any) {
        console.error("Error generating description:", e);
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleDeleteDescription = async (descId: number) => {
    const originalDescriptions = aiDescriptions;
    setAiDescriptions(prev => prev.filter(d => d.id !== descId));

    const { error } = await supabase
        .from('user_ai_descriptions')
        .delete()
        .eq('id', descId);
    
    if (error) {
        console.error("Error deleting description:", error);
        setAiDescriptions(originalDescriptions); // revert on error
    }
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };
  
  if (loading || authLoading) {
    return <LoadingScreen message="Indlæser profil..." />;
  }

  if (!fullUser) {
    return (
      <div className="p-4 text-center">
        <p>Kunne ikke indlæse brugerprofil.</p>
        <button onClick={() => refetchUserProfile()} className="text-primary mt-2">Prøv igen</button>
      </div>
    );
  }
  
  const interests: Interest[] = fullUser.interests || [];
  const tags: PersonalityTag[] = fullUser.personality_tags || [];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
        <header className="flex-shrink-0 bg-white dark:bg-dark-surface p-4 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between max-w-5xl mx-auto">
                <button onClick={() => theme === 'dark' ? toggleTheme() : undefined} className={`p-2 rounded-full ${theme !== 'dark' ? 'text-primary bg-primary-light' : 'text-gray-500'}`}><Sun /></button>
                <h1 className="text-xl font-bold text-primary">SoulMatch</h1>
                <button onClick={() => theme === 'light' ? toggleTheme() : undefined} className={`p-2 rounded-full ${theme !== 'light' ? 'text-primary bg-primary-light' : 'text-gray-500'}`}><Moon /></button>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-4">
             <div className="max-w-xl mx-auto p-4">
                <section className="text-center mb-6">
                    <div className="relative inline-block">
                        <PrivateImage src={fullUser.avatar_url} alt={fullUser.name} className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-white dark:border-dark-surface shadow-lg" />
                    </div>
                    <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-4">{fullUser.name}, {fullUser.age}</h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary">{fullUser.location}</p>
                    {fullUser.personality_type && <p className="mt-2 text-lg font-bold text-primary">{fullUser.personality_type}</p>}
                    <div className="flex justify-center space-x-2 mt-4">
                        <Link to="/settings" className="btn-secondary"><Settings size={18} className="mr-2"/> Indstillinger</Link>
                        <Link to="/edit-profile" className="btn-secondary"><Edit size={18} className="mr-2"/> Rediger profil</Link>
                    </div>
                </section>
                
                <nav className="flex justify-center border-b border-gray-200 dark:border-dark-border mb-6">
                    <button onClick={() => setActiveTab('about')} className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}><Users size={18} className="mr-2"/> Om Mig</button>
                    <button onClick={() => setActiveTab('personality')} className={`tab-button ${activeTab === 'personality' ? 'active' : ''}`}><BrainCircuit size={18} className="mr-2"/> Personlighed</button>
                    <button onClick={() => setActiveTab('interests')} className={`tab-button ${activeTab === 'interests' ? 'active' : ''}`}><Heart size={18} className="mr-2"/> Interesser</button>
                </nav>

                <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-sm min-h-[300px]">
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                            {activeTab === 'about' && (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-text-primary dark:text-dark-text-primary">Bio</h3>
                                    <p className="text-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap">{fullUser.bio || "Ingen bio tilføjet."}</p>
                                </div>
                            )}
                            {activeTab === 'personality' && (
                                <PersonalityDimensionChart dimensions={fullUser.personality_dimensions || []} />
                            )}
                            {activeTab === 'interests' && (
                                <div>
                                    <div className="mb-6">
                                        <h3 className="font-bold text-lg mb-3 text-text-primary dark:text-dark-text-primary">Interesser</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {interests.length > 0 ? interests.map(i => <span key={i.id} className="tag-interest">{i.name}</span>) : <p className="text-sm text-text-secondary">Ingen interesser valgt.</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg mb-3 text-text-primary dark:text-dark-text-primary">Personlighed</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {tags.length > 0 ? tags.map(t => <span key={t.id} className="tag-personality">{t.name}</span>) : <p className="text-sm text-text-secondary">Ingen personlighedstags valgt.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                 <section className="mt-8">
                    <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Beskrivelser fra min AI-analyse</h3>
                    <motion.div layout className="space-y-4">
                        <AnimatePresence>
                            {aiDescriptions.map((desc, index) => (
                                <motion.div
                                    key={desc.id}
                                    layout
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className="relative bg-white dark:bg-dark-surface p-5 rounded-lg shadow-sm border-l-4 border-accent overflow-hidden"
                                >
                                    <div className="absolute top-4 right-4 text-accent/80">
                                        <BrainCircuit size={24} />
                                    </div>
                                    <h4 className="font-semibold text-accent mb-2">AI-genereret biografi</h4>
                                    <p className="text-text-secondary dark:text-dark-text-secondary pr-8">
                                        {desc.description}
                                    </p>
                                    <button
                                        onClick={() => handleDeleteDescription(desc.id)}
                                        className="absolute bottom-2 right-2 p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-light"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                    <div className="mt-6 text-center">
                        <button 
                            onClick={handleGenerateDescription}
                            disabled={isGenerating}
                            className="inline-flex items-center justify-center bg-accent text-white font-bold py-2 px-5 rounded-full text-sm hover:bg-opacity-80 transition-colors shadow-md disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isGenerating ? <Loader2 className="animate-spin mr-2"/> : <Sparkles size={16} className="mr-2" />}
                            {isGenerating ? 'Genererer...' : 'Generer ny biografi med AI'}
                        </button>
                    </div>
                </section>
                
                 <div className="mt-8 grid grid-cols-2 gap-4">
                    <Link to="/friends" className="profile-grid-link"><Users size={20} className="mr-2"/> Mine Venner</Link>
                    <Link to="/my-events" className="profile-grid-link"><Award size={20} className="mr-2"/> Mine Events</Link>
                 </div>
                 
                 <div className="mt-8 flex justify-center">
                    <button onClick={handleLogout} className="flex items-center text-red-500 font-bold py-2 px-4 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                        <LogOut size={18} className="mr-2"/> Log ud
                    </button>
                 </div>
             </div>
        </main>
        <style>{`
            .btn-secondary { display: inline-flex; align-items: center; background-color: #F3F4F6; color: #374151; font-weight: 600; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem; }
            .dark .btn-secondary { background-color: #374151; color: #D1D5DB; }
            .tab-button { padding: 0.75rem 1rem; font-weight: 600; border-bottom: 2px solid transparent; color: #6B7280; display: inline-flex; align-items: center; }
            .dark .tab-button { color: #9CA3AF; }
            .tab-button.active { color: #006B76; border-color: #006B76; }
            .tag-interest { background-color: #DBEAFE; color: #1E40AF; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }
            .dark .tag-interest { background-color: #1E3A8A; color: #BFDBFE; }
            .tag-personality { background-color: #E0E7FF; color: #4338CA; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }
            .dark .tag-personality { background-color: #3730A3; color: #C7D2FE; }
            .profile-grid-link { display: flex; align-items: center; justify-content: center; background-color: #fff; border-radius: 0.5rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); font-weight: 600; padding: 1rem; }
            .dark .profile-grid-link { background-color: #1f2937; color: #D1D5DB; }
        `}</style>
    </div>
  );
};

export default ProfilePage;
