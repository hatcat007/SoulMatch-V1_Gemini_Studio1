import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Info, Ticket, MapPin, Users, Phone, Clock, Share2, CheckSquare, Award, ImageIcon, Loader2 } from 'lucide-react';
import type { Place, User, MessageThread, Activity, Interest } from '../types';
import ShareModal from '../components/ShareModal';
import ImageSlideshow from '../components/ImageSlideshow';
import { supabase } from '../services/supabase';
import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';
import SoulmatchCertification from '../components/SoulmatchCertification';
import { fetchPrivateFile } from '../services/s3Service';


const slugify = (text: string): string => {
  if (!text) return '';
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

const PrivateImage: React.FC<{src?: string, alt: string, className: string}> = ({ src, alt, className }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            setLoading(true);
            fetchPrivateFile(src).then(url => {
                objectUrl = url;
                setImageUrl(url);
                setLoading(false);
            }).catch(() => setLoading(false));
        } else {
            setLoading(false);
        }

        return () => {
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    if(loading) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light animate-pulse`} />;
    if(!imageUrl) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light flex items-center justify-center`}><ImageIcon className="text-gray-400" /></div>;

    return <img src={imageUrl} alt={alt} className={className} />;
};


const PlaceDetailPage: React.FC = () => {
    const { placeId } = useParams<{ placeId: string }>();
    const navigate = useNavigate();
    const { user: currentUser, loading: authLoading } = useAuth();
    
    const [place, setPlace] = useState<any | null>(null);
    const [soulmates, setSoulmates] = useState<MessageThread[]>([]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareConfirmation, setShareConfirmation] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCertification, setShowCertification] = useState(false);
    
    const fetchInitialData = useCallback(async () => {
        if (!placeId) return;
        if (!currentUser) {
            if (!authLoading) navigate('/login');
            return;
        }
        setLoading(true);

        const { data, error } = await supabase
            .from('places')
            .select('*, is_certified, images:place_images(id, image_url), organization:organizations(id, name, logo_url, activities:organization_activities(activity:activities(*)), emojis), category:categories(*), place_activities:place_activities(activity:activities(*)), place_interests:place_interests(interest:interests(*))')
            .eq('id', placeId)
            .single();
        
        if (error) {
            console.error('Error fetching place details:', error.message);
            setPlace(null);
        } else {
            setPlace(data as Place);
        }

        const { data: threadParticipants } = await supabase.from('message_thread_participants').select('thread_id').eq('user_id', currentUser.id);
        if (threadParticipants && threadParticipants.length > 0) {
            const threadIds = threadParticipants.map(tp => tp.thread_id);
            const { data: threadsData } = await supabase.from('message_threads').select('id, participants:message_thread_participants(user:users(*))').in('id', threadIds);
            
            if (threadsData) {
                const soulmateThreads: MessageThread[] = threadsData.map(thread => {
                    const otherParticipant = thread.participants.find(p => {
                        if (!p.user) return false;
                        const user = Array.isArray(p.user) ? p.user[0] : p.user;
                        return user && user.id !== currentUser.id;
                    });
                    
                    if (!otherParticipant) return null;

                    const user = Array.isArray(otherParticipant.user) ? otherParticipant.user[0] : otherParticipant.user;
                    if (!user) return null;
                    
                    return { id: thread.id, participants: [{ user: user as User }], last_message: '', timestamp: '', unread_count: 0 };
                }).filter((t): t is MessageThread => t !== null);
                
                const uniqueThreads = Array.from(new Map(soulmateThreads.map(t => [t.participants[0].user.id, t])).values());
                setSoulmates(uniqueThreads);
            }
        }

        setLoading(false);
    }, [placeId, navigate, currentUser, authLoading]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleShare = async (thread: MessageThread) => {
        setShowShareModal(false);
        if (!place || !currentUser) return;
        const user = thread.participants[0].user;
        
        const card_data = {
            type: 'place' as const, id: place.id, title: place.name, image_url: place.image_url || place.images?.[0]?.image_url,
            address: place.address, offer: place.is_sponsored ? place.offer : undefined,
        };
        
        const { error } = await supabase.from('messages').insert({ thread_id: thread.id, sender_id: currentUser.id, text: `Hey! Jeg har fundet dette sted "${place.name}". Skal vi mødes her?`, card_data });
        
        if (error) setShareConfirmation(`Fejl: Kunne ikke dele med ${user.name}.`);
        else setShareConfirmation(`Mødested delt med ${user.name}!`);
        setTimeout(() => setShareConfirmation(''), 3000);
    };

    const handlePublicShare = () => {
        if (!place || !place.organization?.name) {
            setShareConfirmation('Kun mødesteder fra organisationer kan deles.');
            setTimeout(() => setShareConfirmation(''), 3000);
            return;
        }
        const orgSlug = slugify(place.organization.name);
        const placeSlug = slugify(place.name);
        const publicUrl = `${window.location.origin}/#/place/public/${orgSlug}/${placeSlug}`;

        navigator.clipboard.writeText(publicUrl).then(() => {
            setShareConfirmation('Offentligt link kopieret!');
            setTimeout(() => setShareConfirmation(''), 3000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            setShareConfirmation('Kunne ikke kopiere link.');
            setTimeout(() => setShareConfirmation(''), 3000);
        });
    };

    if (authLoading || loading) return <LoadingScreen message="Indlæser mødested..." />;
    if (!place) return <div className="p-4 text-center"><p>Mødested ikke fundet.</p><button onClick={() => navigate('/places')} className="text-primary mt-4">Tilbage</button></div>;

    const allActivities = place.place_activities?.map((pa: any) => pa.activity).filter((a: Activity) => !!a) || [];
    const allInterests = place.place_interests?.map((pi: any) => pi.interest).filter((i: Interest) => !!i) || [];
    
    const organizationActivities = place.organization?.activities?.map((act: any) => act.activity).filter(Boolean) || [];
    const organizationInterests = place.organization?.emojis || [];


    return (
        <div className="flex flex-col h-full bg-background dark:bg-dark-background">
            {showCertification && <SoulmatchCertification onClose={() => setShowCertification(false)} />}
            <header className="fixed top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md md:relative md:bg-transparent md:backdrop-blur-none dark:bg-dark-surface/90 dark:md:bg-transparent border-b border-gray-100 dark:border-dark-border md:border-0">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary dark:text-dark-text-primary hover:bg-primary-light dark:hover:bg-dark-surface-light rounded-full transition-colors"><ArrowLeft size={24} /></button>
                    <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Mødested Detaljer</h1>
                    <button onClick={handlePublicShare} className="p-2 -mr-2 text-text-primary dark:text-dark-text-primary hover:bg-primary-light dark:hover:bg-dark-surface-light rounded-full transition-colors" aria-label="Del mødested"><Share2 size={20} /></button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                 <div className="relative">
                    <ImageSlideshow imageUrl={place.image_url} images={place.images} alt={place.name} />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{place.icon || '📍'}</span>
                                <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">{place.category?.name || 'Mødested'}</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{place.name}</h1>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
                     {place.is_certified && (
                        <button onClick={() => setShowCertification(true)} className="w-full bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 text-left hover:shadow-lg transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-full"><Award className="text-yellow-600 dark:text-yellow-400" size={24} /></div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-yellow-800 dark:text-yellow-300 text-lg mb-1">SoulMatch Certificeret Mødested</h3>
                                    <p className="text-yellow-700 dark:text-yellow-200 font-medium text-sm">Dette sted er verificeret som et trygt og venligt sted at mødes. Klik for at se hvad det betyder.</p>
                                </div>
                            </div>
                        </button>
                    )}
                    
                    {place.is_sponsored && place.offer && (
                        <div className="bg-primary-light dark:bg-primary/20 rounded-2xl p-6 shadow-sm border border-primary/20 dark:border-dark-border">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-primary/20 dark:bg-primary/30 rounded-full">
                                    <Ticket className="text-primary-dark dark:text-primary-light" size={20} />
                                </div>
                                <h3 className="font-bold text-primary-dark dark:text-primary-light">Dagens SoulMatch Tilbud</h3>
                            </div>
                            <p className="text-2xl font-bold text-primary dark:text-primary">{place.offer}</p>
                        </div>
                    )}

                    <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border"><h3 className="font-bold text-text-primary dark:text-dark-text-primary text-xl mb-4">Om Mødestedet</h3><div className="prose prose-gray dark:prose-invert max-w-none"><p>{place.description || 'Ingen beskrivelse tilgængelig.'}</p></div></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {place.address && (<div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border"><div className="flex items-center gap-3 mb-3"><div className="p-2 bg-primary-light dark:bg-primary/20 rounded-full"><MapPin className="text-primary" size={20} /></div><h3 className="font-bold text-text-primary dark:text-dark-text-primary">Adresse</h3></div><p className="text-text-secondary dark:text-dark-text-secondary font-medium">{place.address}</p></div>)}
                         {place.phone && (<div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border"><div className="flex items-center gap-3 mb-3"><div className="p-2 bg-primary-light dark:bg-primary/20 rounded-full"><Phone className="text-primary" size={20} /></div><h3 className="font-bold text-text-primary dark:text-dark-text-primary">Telefon</h3></div><a href={`tel:${place.phone}`} className="text-text-secondary dark:text-dark-text-secondary font-medium hover:underline">{place.phone}</a></div>)}
                        {place.opening_hours && (<div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border"><div className="flex items-center gap-3 mb-3"><div className="p-2 bg-primary-light dark:bg-primary/20 rounded-full"><Clock className="text-primary" size={20} /></div><h3 className="font-bold text-text-primary dark:text-dark-text-primary">Åbningstider</h3></div><p className="text-text-secondary dark:text-dark-text-secondary font-medium whitespace-pre-wrap">{place.opening_hours}</p></div>)}
                    </div>
                    
                    {place.organization_id && place.organization && (
                        <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    {place.organization.logo_url && <PrivateImage src={place.organization.logo_url} alt={place.organization.name} className="w-12 h-12 object-contain" />}
                                    <div>
                                        <h3 className="font-bold text-text-primary dark:text-dark-text-primary">Arrangør</h3>
                                        <p className="text-text-secondary dark:text-dark-text-secondary text-sm">{place.organization.name}</p>
                                    </div>
                                </div>
                                <Link to={`/organization/${place.organization_id}`} className="bg-primary text-white px-4 py-2 rounded-full font-semibold text-sm hover:bg-primary-dark transition-colors">
                                    Se profil
                                </Link>
                            </div>

                            {(organizationActivities.length > 0 || organizationInterests.length > 0) && (
                                <div className="border-t border-gray-100 dark:border-dark-border pt-4">
                                    {organizationActivities.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="font-semibold text-text-primary dark:text-dark-text-primary text-sm mb-2">Organisationens Aktiviteter</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {organizationActivities.map((activity: Activity) => (
                                                    <span key={activity.id} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-2 py-1 rounded-md text-xs font-medium">{activity.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {organizationInterests.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-text-primary dark:text-dark-text-primary text-sm mb-2">Organisationens Interesser</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {organizationInterests.map((interestName: string) => (
                                                    <span key={interestName} className="bg-gray-100 dark:bg-dark-surface-light text-text-secondary dark:text-dark-text-secondary px-2 py-1 rounded-md text-xs font-medium">{interestName}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {(allActivities.length > 0 || allInterests.length > 0) && (<div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark-border">{allActivities.length > 0 && (<div className={allInterests.length > 0 ? 'mb-6' : ''}><h3 className="font-bold text-text-primary dark:text-dark-text-primary text-xl mb-4">Stedets Aktiviteter</h3><div className="flex flex-wrap gap-2">{allActivities.map(activity => (<span key={`act-${activity.id}`} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-3 py-1.5 rounded-full text-sm font-medium">{activity.name}</span>))}</div></div>)}{allInterests.length > 0 && (<div><h3 className="font-bold text-text-primary dark:text-dark-text-primary text-xl mb-4">Stedets Interesser</h3><div className="flex flex-wrap gap-2">{allInterests.map(interest => (<span key={`int-${interest.id}`} className="bg-primary-light dark:bg-primary/20 text-primary-dark dark:text-primary-light px-3 py-1.5 rounded-full text-sm font-medium">{interest.name}</span>))}</div></div>)}</div>)}

                </div>
            </main>

            <footer className="sticky bottom-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border p-4 z-10">
                <div className="max-w-4xl mx-auto md:flex md:space-x-4 space-y-3 md:space-y-0">
                    <button onClick={() => setShowShareModal(true)} className="w-full md:w-auto md:flex-1 bg-primary-light text-primary dark:bg-dark-surface-light dark:text-dark-text-primary font-bold py-3 px-4 rounded-full text-lg transition duration-300 hover:bg-primary/20 dark:hover:bg-dark-border">Del med soulmate 😎</button>
                    <button onClick={() => navigate('/checkin', { state: { place } })} className="w-full md:w-auto md:flex-1 bg-primary text-white font-bold py-3 px-4 rounded-full text-lg transition duration-300 shadow-lg hover:bg-primary-dark flex items-center justify-center">
                        <CheckSquare size={20} className="mr-2"/>
                        {place.is_sponsored && place.offer ? 'Check ind & få rabat' : 'Check ind'}
                    </button>
                </div>
            </footer>
             
            {showShareModal && (<ShareModal title="Del mødested med en Soulmate" soulmates={soulmates} onShare={handleShare} onClose={() => setShowShareModal(false)} />)}
            {shareConfirmation && (<div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm font-bold py-2 px-4 rounded-full z-50">{shareConfirmation}</div>)}
        </div>
    );
};

export default PlaceDetailPage;