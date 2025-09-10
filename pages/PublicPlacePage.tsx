import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Loader2, ImageIcon, Ticket } from 'lucide-react';
import type { Place } from '../types';
import { supabase } from '../services/supabase';
import { fetchPrivateFile } from '../services/s3Service';
import PublicAuthModal from '../components/PublicAuthModal';

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
    useEffect(() => {
        let objectUrl: string | null = null;
        if (src) {
            fetchPrivateFile(src).then(url => { objectUrl = url; setImageUrl(url); });
        }
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [src]);

    if (!imageUrl) return <div className={`${className} bg-gray-200 dark:bg-dark-surface-light animate-pulse flex items-center justify-center`}><ImageIcon className="text-gray-400" size={48}/></div>;
    return <img src={imageUrl} alt={alt} className={className} />;
};

const PublicPlacePage: React.FC = () => {
    const { orgSlug, placeSlug } = useParams<{ orgSlug: string, placeSlug: string }>();
    const [place, setPlace] = useState<Partial<Place> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlaceData = async () => {
            if (!orgSlug || !placeSlug) {
                setLoading(false);
                return;
            }
            // FIX: The `organization` select now includes `id` to satisfy the `Place` type.
            const { data, error } = await supabase
                .from('places')
                .select('name, description, address, image_url, icon, offer, is_sponsored, organization:organizations!inner(id, name)')
                .not('organization_id', 'is', null);

            if (error) {
                console.error("Error fetching public places:", error.message);
                setLoading(false);
                return;
            }

            if (data) {
                const foundPlace = data.find(p => {
                    const placeData = p as any;
                    const org = Array.isArray(placeData.organization) ? placeData.organization[0] : placeData.organization;
                    if (!org) return false;
                    const currentOrgSlug = slugify(org.name);
                    const currentPlaceSlug = slugify(placeData.name);
                    return currentOrgSlug === orgSlug && currentPlaceSlug === placeSlug;
                });
                
                // FIX: Handle cases where Supabase returns a relationship as an array.
                // This ensures the object passed to setPlace matches the Partial<Place> type.
                if (foundPlace) {
                    const transformedPlace = {
                        ...foundPlace,
                        organization: Array.isArray(foundPlace.organization) ? foundPlace.organization[0] : foundPlace.organization,
                    };
                    setPlace(transformedPlace);
                } else {
                    setPlace(null);
                }
            }
            setLoading(false);
        };
        fetchPlaceData();
    }, [orgSlug, placeSlug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }
    
    if (!place) {
        return (
             <div className="min-h-screen bg-gray-50 dark:bg-dark-background flex flex-col items-center justify-center text-center p-4">
                <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Mødested ikke fundet</h1>
                <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Det mødested, du leder efter, findes ikke eller er blevet fjernet.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-background">
            <PublicAuthModal />
            <div className="max-w-3xl mx-auto p-4 md:p-8">
                 <div className="mb-4">
                    <span className="text-4xl">{place.icon}</span>
                 </div>
                 <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary mb-4">{place.name}</h1>
                 
                 <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-lg mb-6">
                    <PrivateImage src={place.image_url} alt={place.name || 'Mødested'} className="w-full h-full object-cover" />
                 </div>

                 <div className="space-y-4 text-lg">
                    {place.is_sponsored && place.offer && (
                         <div className="flex items-center text-green-600 font-semibold">
                            <Ticket size={20} className="mr-3" />
                            <span>{place.offer}</span>
                        </div>
                    )}
                     <div className="flex items-center text-text-secondary dark:text-dark-text-secondary">
                        <MapPin size={20} className="mr-3 text-primary" />
                        <span>{place.address || 'Adresse ikke angivet'}</span>
                    </div>
                 </div>

                 <div className="mt-8 prose dark:prose-invert max-w-none">
                    <p>{place.description}</p>
                 </div>
            </div>
        </div>
    );
};

export default PublicPlacePage;
