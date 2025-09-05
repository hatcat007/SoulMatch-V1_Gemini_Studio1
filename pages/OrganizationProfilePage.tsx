import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, MessageCircle, ChevronRight, Phone, Mail, Globe, Share2 } from 'lucide-react';
import type { Organization, MessageThread, User, OrganizationOpportunity, OrganizationUpdate } from '../types';
import ShareModal from '../components/ShareModal';
import { supabase } from '../services/supabase';
import { fetchPrivateFile } from '../services/s3Service';
import LoadingScreen from '../components/LoadingScreen';

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

const OrganizationProfilePage: React.FC = () => {
    const { organizationId } = useParams<{ organizationId: string }>();
    const navigate = useNavigate();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [opportunities, setOpportunities] = useState<OrganizationOpportunity[]>([]);
    const [updates, setUpdates] = useState<OrganizationUpdate[]>([]);
    const [soulmates, setSoulmates] = useState<MessageThread[]>([]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareConfirmation, setShareConfirmation] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrganizationData = async () => {
            if (!organizationId) return;
            setLoading(true);

            // Fetch main organization details
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', organizationId)
                .single();

            if (orgError) {
                console.error('Error fetching organization:', orgError);
                setOrganization(null);
            } else {
                setOrganization(orgData);
            }

            // Fetch opportunities
            const { data: oppData, error: oppError } = await supabase
                .from('organization_opportunities')
                .select('name, icon')
                .eq('organization_id', organizationId);
            
            if (oppError) console.error('Error fetching opportunities:', oppError);
            else setOpportunities(oppData || []);

            // Fetch updates
            const { data: updateData, error: updateError } = await supabase
                .from('organization_updates')
                .select('id, image_url')
                .eq('organization_id', organizationId);

            if (updateError) console.error('Error fetching updates:', updateError);
            else setUpdates(updateData || []);

            // Fetch soulmates for sharing
            const { data: soulmateData, error: soulmateError } = await supabase.from('users').select('*').limit(2);
            if (soulmateError) console.error('Error fetching soulmates:', soulmateError);
            else {
                 const threads: MessageThread[] = (soulmateData || []).map((u: User) => ({
                    id: u.id,
                    participants: [{ user: u }],
                    last_message: '',
                    timestamp: '',
                    unread_count: 0,
                }));
                setSoulmates(threads);
            }

            setLoading(false);
        };

        fetchOrganizationData();
    }, [organizationId]);

    // FIX: The handleShare function now accepts a MessageThread object to match the ShareModal's onShare prop.
    const handleShare = (thread: MessageThread) => {
        setShowShareModal(false);
        const user = thread.participants[0]?.user;
        if (!user) return;
        setShareConfirmation(`Profil delt med ${user.name}!`);
        setTimeout(() => setShareConfirmation(''), 3000);
    };
    
    if (loading) {
        return <LoadingScreen message="Loading organization..." />;
    }

    if (!organization) {
        return (
            <div className="p-4 text-center">
                <p>Organization not found.</p>
                <button onClick={() => navigate('/home')} className="text-primary mt-4">Back to home</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary">
            {showShareModal && (
                <ShareModal
                    title={`Del ${organization.name}`}
                    soulmates={soulmates}
                    onShare={handleShare}
                    onClose={() => setShowShareModal(false)}
                />
            )}
            {shareConfirmation && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-bold py-2 px-4 rounded-full z-50">
                    {shareConfirmation}
                </div>
            )}

            {/* Header */}
            <header className="flex-shrink-0 bg-white dark:bg-dark-surface p-4 border-b border-gray-200 dark:border-dark-border">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2" aria-label="Go back">
                        <ArrowLeft size={24} className="text-text-primary dark:text-dark-text-primary" />
                    </button>
                    <h1 className="text-xl font-bold text-primary">SoulMatch</h1>
                    <button className="p-2 -mr-2" aria-label="More options">
                        <MoreVertical size={24} className="text-text-primary dark:text-dark-text-primary" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-24">
                <div className="max-w-5xl mx-auto p-4 md:p-6">
                    
                    {/* Organization Info */}
                    <section className="mb-8 md:flex md:items-start md:space-x-6">
                        <div className="flex-shrink-0 flex justify-center mb-4 md:mb-0">
                            <PrivateImage src={organization.logo_url} alt={`${organization.name} logo`} className="w-24 h-24 object-contain" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{organization.name}</h2>
                            <p className="text-primary font-semibold">{organization.address}</p>
                            <p className="text-text-secondary dark:text-dark-text-secondary mt-2 flex-1">{organization.description}</p>
                        </div>
                    </section>

                    {/* Opportunities */}
                    {opportunities.length > 0 && (
                        <section className="mb-8">
                            <div className="border-t border-b border-gray-200 dark:border-dark-border py-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Mulighed for</h3>
                                    <ChevronRight size={24} className="text-gray-400 dark:text-dark-text-secondary" />
                                </div>
                                <div className="flex space-x-4 overflow-x-auto pb-2 -mb-2">
                                    {opportunities.map((op, index) => (
                                        <div key={index} className="flex flex-col items-center text-center flex-shrink-0 w-24">
                                            <div className="w-16 h-16 bg-primary-light dark:bg-dark-surface-light rounded-full flex items-center justify-center text-3xl mb-2">
                                                {op.icon}
                                            </div>
                                            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">{op.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Contact Info */}
                    <section className="mb-8">
                        <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Kontaktinformation</h3>
                        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-dark-border">
                            {organization.phone && (
                                <a href={`tel:${organization.phone}`} className="flex items-center p-4 text-text-secondary dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-surface-light transition-colors">
                                    <Phone size={20} className="mr-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    <span className="font-medium text-text-primary dark:text-dark-text-primary">{organization.phone}</span>
                                </a>
                            )}
                            {organization.email && (
                                <a href={`mailto:${organization.email}`} className="flex items-center p-4 text-text-secondary dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-surface-light transition-colors">
                                    <Mail size={20} className="mr-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    <span className="font-medium text-text-primary dark:text-dark-text-primary">{organization.email}</span>
                                </a>
                            )}
                            {organization.website && (
                                <a href={`https://${organization.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 text-text-secondary dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-surface-light transition-colors">
                                    <Globe size={20} className="mr-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    <span className="font-medium text-text-primary dark:text-dark-text-primary">{organization.website}</span>
                                </a>
                            )}
                        </div>
                    </section>

                    {/* Updates */}
                    {updates.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-4">Nye opdateringer</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {updates.map(update => (
                                    <div key={update.id} className="aspect-square">
                                        <PrivateImage src={update.image_url} alt={`Update ${update.id}`} className="w-full h-full object-cover rounded-lg shadow-md" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            </main>

            <footer className="sticky bottom-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border p-4 z-10">
                <div className="max-w-5xl mx-auto flex space-x-4">
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="w-full flex-1 bg-primary-light text-primary dark:bg-dark-surface-light dark:text-dark-text-primary font-bold py-3 px-4 rounded-full text-lg transition duration-300 hover:bg-primary/20 dark:hover:bg-dark-surface-light/80 flex items-center justify-center"
                    >
                        <Share2 size={20} className="mr-2"/>
                        Del Profil
                    </button>
                    <button
                        className="w-full flex-1 bg-primary text-white font-bold py-3 px-4 rounded-full text-lg transition duration-300 shadow-lg hover:bg-primary-dark flex items-center justify-center"
                    >
                        <MessageCircle size={20} className="mr-2"/>
                        Send Besked
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default OrganizationProfilePage;