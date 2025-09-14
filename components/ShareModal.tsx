import React, { useState, useEffect } from 'react';
import type { MessageThread } from '../types';
import { fetchPrivateFile } from '../services/s3Service';
import { Copy, Check } from 'lucide-react';

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

    if(!imageUrl) {
        return <div className={`${className} bg-gray-200`} />;
    }

    return <img src={imageUrl} alt={alt} className={className} />;
};

const ShareModal: React.FC<{
  title: string;
  soulmates: MessageThread[];
  onShare: (thread: MessageThread) => void;
  onClose: () => void;
  publicUrl?: string; // Prop for the public URL path
}> = ({ title, soulmates, onShare, onClose, publicUrl }) => {
    const [copied, setCopied] = useState(false);
    
    // Construct the full shareable URL for HashRouter
    const fullPublicUrl = publicUrl ? `${window.location.href.split('#')[0]}#${publicUrl}` : '';

    const handleCopyLink = () => {
        if (fullPublicUrl) {
            navigator.clipboard.writeText(fullPublicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 w-11/12 max-w-sm" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-text-primary dark:text-dark-text-primary">Del med SoulMatch</h2>
                
                {soulmates.length > 0 ? (
                    <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {soulmates.map(thread => {
                            const user = thread.participants?.[0]?.user;
                            if (!user) {
                                return null;
                            }
                            return (
                                <li key={thread.id} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <PrivateImage src={user.avatar_url} alt={user.name} className="w-12 h-12 rounded-full mr-3 object-cover"/>
                                        <span className="font-semibold text-text-primary dark:text-dark-text-primary">{user.name}</span>
                                    </div>
                                    <button onClick={() => onShare(thread)} className="bg-primary text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors">
                                        Send
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-sm text-center text-text-secondary dark:text-dark-text-secondary py-4">Du har ingen venner at dele med endnu.</p>
                )}

                {publicUrl && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                        <h3 className="text-sm font-semibold text-text-secondary dark:text-dark-text-secondary mb-2">Eller del et offentligt link</h3>
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                readOnly
                                value={fullPublicUrl}
                                className="w-full bg-gray-100 dark:bg-dark-surface-light text-text-secondary dark:text-dark-text-secondary px-3 py-2 rounded-lg text-sm truncate"
                            />
                            <button
                                onClick={handleCopyLink}
                                className={`flex-shrink-0 w-28 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 ${
                                    copied
                                        ? 'bg-green-500 text-white'
                                        : 'bg-primary text-white hover:bg-primary-dark'
                                }`}
                            >
                                {copied ? <Check size={16} className="mr-1.5"/> : <Copy size={16} className="mr-1.5"/>}
                                {copied ? 'Kopieret!' : 'Kopier'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShareModal;