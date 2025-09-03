import React, { useState } from 'react';
import type { User } from '../types';
import { supabase } from '../services/supabase';
import { X, Loader2 } from 'lucide-react';

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  reporterUser: User;
  reportedUser: User;
}

const reportReasons = [
  { id: 'spam', label: 'Spam eller reklame' },
  { id: 'harassment', label: 'Chikane eller mobning' },
  { id: 'fake_profile', label: 'Falsk profil / Svindel' },
  { id: 'inappropriate_content', label: 'Upassende indhold' },
  { id: 'other', label: 'Andet' },
];

const ReportUserModal: React.FC<ReportUserModalProps> = ({ isOpen, onClose, reporterUser, reportedUser }) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setError('Vælg venligst en årsag.');
      return;
    }
    
    setStatus('loading');
    setError(null);

    const { error: insertError } = await supabase.from('user_reports').insert({
      reporter_user_id: reporterUser.id,
      reported_user_id: reportedUser.id,
      reason: selectedReason,
      comment: comment,
    });

    if (insertError) {
      setError(insertError.message);
      setStatus('error');
    } else {
      setStatus('success');
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state for next time modal opens
    setTimeout(() => {
        setSelectedReason('');
        setComment('');
        setStatus('idle');
        setError(null);
    }, 300); // delay to allow for closing animation
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-3 right-3 p-1 text-gray-500 hover:text-gray-800 dark:text-dark-text-secondary dark:hover:text-dark-text-primary rounded-full">
            <X size={24} />
        </button>
        
        <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-1">Anmeld {reportedUser.name}</h2>
        <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Din anmeldelse er anonym. Tak fordi du hjælper med at holde SoulMatch trygt.</p>
        
        {status === 'success' ? (
            <div className="text-center py-8">
                <p className="font-semibold text-green-600">Tak for din anmeldelse!</p>
                <p className="text-text-secondary">Vi vil kigge på den snarest muligt.</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h3 className="font-semibold text-text-primary dark:text-dark-text-primary mb-2">Hvad er årsagen?</h3>
                <div className="space-y-2">
                  {reportReasons.map(reason => (
                    <label key={reason.id} className="flex items-center p-3 bg-gray-50 dark:bg-dark-surface-light rounded-lg cursor-pointer border-2 border-transparent has-[:checked]:border-primary has-[:checked]:bg-primary-light dark:has-[:checked]:bg-primary/20">
                      <input 
                        type="radio" 
                        name="report-reason" 
                        value={reason.id} 
                        checked={selectedReason === reason.id}
                        onChange={() => setSelectedReason(reason.id)}
                        className="w-5 h-5 text-primary focus:ring-primary focus:ring-offset-0 border-gray-300"
                      />
                      <span className="ml-3 font-medium text-text-primary dark:text-dark-text-primary">{reason.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {(selectedReason === 'other' || selectedReason === 'harassment') && (
                 <div>
                    <label htmlFor="comment" className="font-semibold text-text-primary dark:text-dark-text-primary mb-2 block">
                        Uddyb venligst (valgfrit)
                    </label>
                    <textarea 
                        id="comment" 
                        rows={3} 
                        value={comment} 
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-surface-light border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Giv os flere detaljer om situationen..."
                    />
                 </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}
              
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={handleClose} className="px-6 py-2 rounded-full text-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-surface-light font-semibold">
                    Annuller
                </button>
                 <button 
                    type="submit" 
                    disabled={status === 'loading'}
                    className="flex items-center justify-center px-6 py-2 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition disabled:opacity-50"
                 >
                    {status === 'loading' && <Loader2 className="animate-spin mr-2" size={20} />}
                    Send anmeldelse
                </button>
              </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default ReportUserModal;
