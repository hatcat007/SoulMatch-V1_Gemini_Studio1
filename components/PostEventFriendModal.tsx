import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import type { User, Friendship } from '../types';
import { supabase } from '../services/supabase';
import { fetchPrivateFile } from '../services/s3Service';

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            setLoading(true);
            fetchPrivateFile(src).then(url => { objectUrl = url; setImageUrl(url); setLoading(false); });
        } else { setLoading(false); }
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [src]);

    if(loading) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light animate-pulse`} />;
    if(!imageUrl) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light flex items-center justify-center`}><ImageIcon className="text-gray-400" /></div>;
    return <img src={imageUrl} alt={alt} className={className} />;
};


interface PostEventFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: User[];
  currentUser: User;
}

const PostEventFriendModal: React.FC<PostEventFriendModalProps> = ({ isOpen, onClose, participants, currentUser }) => {
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());
  const [existingFriendIds, setExistingFriendIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const fetchFriendships = async () => {
        setLoading(true);
        const { data } = await supabase.from('friends').select('user_id_1, user_id_2, status, action_user_id').or(`user_id_1.eq.${currentUser.id},user_id_2.eq.${currentUser.id}`);
        const friendIds = new Set<number>();
        const sentIds = new Set<number>();
        (data || []).forEach(f => {
            const friendId = f.user_id_1 === currentUser.id ? f.user_id_2 : f.user_id_1;
            friendIds.add(friendId);
            if (f.status === 'pending' && f.action_user_id === currentUser.id) {
                sentIds.add(friendId);
            }
        });
        setExistingFriendIds(friendIds);
        setSentRequests(sentIds);
        setLoading(false);
    };
    fetchFriendships();
  }, [isOpen, currentUser.id]);
  
  const handleSendRequest = async (friendId: number) => {
    setSentRequests(prev => new Set(prev).add(friendId));
    const u1 = Math.min(currentUser.id, friendId);
    const u2 = Math.max(currentUser.id, friendId);
    await supabase.from('friends').insert({ user_id_1: u1, user_id_2: u2, action_user_id: currentUser.id, status: 'pending' });
  };
  
  const otherParticipants = participants.filter(p => p.id !== currentUser.id);

  return (
    <AnimatePresence>
        {isOpen && (
             <motion.div
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="bg-white dark:bg-dark-surface rounded-2xl p-6 w-full max-w-md relative flex flex-col max-h-[80vh]"
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                     <div className="text-center mb-6 flex-shrink-0">
                        <h2 className="text-2xl font-bold text-primary">MAKE THE NEXT STEP!</h2>
                        <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Snakkede du godt med nogen? Smid dem da lige en besked. De sidder sikkert også og tænker det samme som dig.</p>
                        <p className="text-xs text-text-secondary/70 dark:text-dark-text-secondary/70 mt-1">Psssst... Måske en ny ven for livet?</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {loading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : otherParticipants.map(participant => {
                             const isFriend = existingFriendIds.has(participant.id);
                             const isRequestSent = sentRequests.has(participant.id);
                             return (
                                <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface-light">
                                    <div className="flex items-center">
                                        <PrivateImage src={participant.avatar_url} alt={participant.name} className="w-12 h-12 rounded-full mr-3 object-cover" />
                                        <span className="font-semibold text-text-primary dark:text-dark-text-primary">{participant.name}</span>
                                    </div>
                                    <button
                                        onClick={() => handleSendRequest(participant.id)}
                                        disabled={isFriend || isRequestSent}
                                        className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
                                            isRequestSent ? 'bg-gray-200 text-gray-500 cursor-not-allowed' :
                                            isFriend ? 'bg-green-100 text-green-700 cursor-not-allowed' :
                                            'bg-primary text-white hover:bg-primary-dark'
                                        }`}
                                    >
                                        {isRequestSent ? <><Check size={16} className="inline mr-1"/> Sendt</> : isFriend ? 'Venner' : <><UserPlus size={16} className="inline mr-1"/> Tilføj</>}
                                    </button>
                                </div>
                             )
                        })}
                    </div>

                     <button onClick={onClose} className="mt-6 w-full flex-shrink-0 bg-gray-200 dark:bg-dark-surface-light text-text-secondary dark:text-dark-text-secondary font-bold py-3 px-4 rounded-full text-lg">
                        Luk
                    </button>

                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
  );
};

export default PostEventFriendModal;
