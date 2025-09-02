
import React from 'react';
import type { MessageThread, User } from '../types';

const ShareModal: React.FC<{
  title: string;
  soulmates: MessageThread[];
  onShare: (user: User) => void;
  onClose: () => void;
}> = ({ title, soulmates, onShare, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl p-6 w-11/12 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-text-primary">{title}</h2>
            <ul className="space-y-3 max-h-80 overflow-y-auto">
                {soulmates.map(thread => {
                    const user = thread.participants?.[0]?.user;
                    if (!user) {
                        return null;
                    }
                    return (
                        <li key={thread.id} className="flex items-center justify-between">
                            <div className="flex items-center">
                                <img src={user.avatar_url} alt={user.name} className="w-12 h-12 rounded-full mr-3"/>
                                <span className="font-semibold text-text-primary">{user.name}</span>
                            </div>
                            <button onClick={() => onShare(user)} className="bg-primary text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors">
                                Send
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    </div>
);

export default ShareModal;
