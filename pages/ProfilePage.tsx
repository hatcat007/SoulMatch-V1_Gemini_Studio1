
import React, { useState, useEffect } from 'react';
import { Settings, MessageCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface Trait {
  label: string;
  left: string;
  right: string;
  value: number; // 0 to 100
}

interface Profile {
    id: number;
    name: string;
    location: string;
    bio: string;
    avatarUrl: string;
    emojis: string[];
    images: string[];
    personalityType: string;
}

const TraitSlider: React.FC<{ trait: Trait }> = ({ trait }) => {
  const isBalanced = trait.value > 40 && trait.value < 60;
  return (
    <div className="mb-4">
        <div className="flex justify-between items-center mb-1 text-sm text-gray-600">
            <span>{trait.label}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 relative">
             <div className="bg-gray-300 h-2 absolute top-0 left-1/2 w-px"></div>
             <div
                className={`h-2 rounded-full ${isBalanced ? 'bg-yellow-400' : trait.value > 50 ? 'bg-red-400' : 'bg-blue-400'}`}
                style={{ width: `${Math.abs(trait.value - 50)}%`, left: `${Math.min(trait.value, 50)}%` }}
            ></div>
        </div>
        <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
            <span>{trait.value > 50 ? '' : 'Indadvendt'}</span>
            <span>{trait.value < 50 ? '' : 'Udadvendt'}</span>
        </div>
    </div>
  )
};

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [traits, setTraits] = useState<Trait[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // For demonstration, we'll fetch a specific user's profile (ID 1)
  const USER_ID = 1;

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', USER_ID)
          .single();

        if (profileError) throw profileError;

        setProfile({
            id: profileData.id,
            name: profileData.name,
            location: profileData.location,
            bio: profileData.bio,
            avatarUrl: profileData.avatar_url,
            emojis: profileData.emojis,
            images: profileData.images,
            personalityType: profileData.personality_type
        });

        const { data: traitsData, error: traitsError } = await supabase
          .from('personality_traits')
          .select('*')
          .eq('user_id', USER_ID);

        if (traitsError) throw traitsError;
        
        const formattedTraits: Trait[] = traitsData.map(trait => ({
            label: trait.label,
            value: trait.value,
            left: trait.left_label,
            right: trait.right_label,
        }));
        setTraits(formattedTraits);

      } catch (err: any) {
        setError("Kunne ikke hente profil. Prøv igen senere.");
        console.error("Error fetching profile:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Henter profil...</div>;
  }

  if (error || !profile) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="p-4">
        <div className="flex justify-end space-x-3 mb-4">
            <button className="p-2 border border-gray-300 rounded-full text-gray-600">
                <MessageCircle size={24}/>
            </button>
            <button className="p-2 border border-gray-300 rounded-full text-gray-600">
                <Settings size={24}/>
            </button>
        </div>

        <div className="flex flex-col items-center text-center">
            <img 
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-28 h-28 rounded-full border-4 border-white shadow-lg mb-3"
            />
            <h1 className="text-2xl font-bold text-text-primary">{profile.name} 🛡️</h1>
            <p className="text-text-secondary">{profile.location}</p>
            <p className="mt-2 max-w-xs">
                {profile.bio}
            </p>
        </div>

        <div className="flex justify-center space-x-4 my-6">
            {profile.emojis.map((emoji, index) => (
                 <div key={index} className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${['bg-yellow-200', 'bg-red-200', 'bg-blue-200'][index % 3]}`}>
                    {emoji}
                 </div>
            ))}
        </div>

        <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-3">Billeder som beskriver mig</h2>
            <div className="grid grid-cols-3 gap-2">
                {profile.images.map((imgSrc, index) => (
                    <img key={index} src={imgSrc} alt="User image" className="rounded-lg aspect-square object-cover"/>
                ))}
            </div>
        </div>

        <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">Personlighed</h2>
            <p className="text-xl font-bold text-text-primary mb-4">{profile.personalityType}</p>
            {traits.map(trait => <TraitSlider key={trait.label} trait={trait} />)}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
