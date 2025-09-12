import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, Loader2, ImageIcon } from 'lucide-react';
import type { Event } from '../types';
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

const PublicEventPage: React.FC = () => {
    const { orgSlug, eventSlug } = useParams<{ orgSlug: string, eventSlug: string }>();
    const [event, setEvent] = useState<Partial<Event> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEventData = async () => {
            if (!orgSlug || !eventSlug) {
                setLoading(false);
                return;
            }
            // Fetch all events from organizations to perform client-side slug matching
            // FIX: The `organization` select now includes all required fields to satisfy the `Organization` type.
            const { data, error } = await supabase
                .from('events')
                .select('title, description, time, address, image_url, icon, organization:organizations!inner(id, name, logo_url, address, description)')
                .not('organization_id', 'is', null);

            if (error) {
                console.error("Error fetching public events:", error.message);
                setLoading(false);
                return;
            }

            if (data) {
                // Find the matching event by slugifying each one
                const foundEvent = data.find(e => {
                    const eventData = e as any;
                    const org = Array.isArray(eventData.organization) ? eventData.organization[0] : eventData.organization;
                    if (!org) return false;
                    const currentOrgSlug = slugify(org.name);
                    const currentEventSlug = slugify(eventData.title);
                    return currentOrgSlug === orgSlug && currentEventSlug === eventSlug;
                });
                
                // FIX: Handle cases where Supabase returns a relationship as an array.
                // This ensures the object passed to setEvent matches the Partial<Event> type.
                if (foundEvent) {
                    const transformedEvent = {
                        ...foundEvent,
                        organization: Array.isArray(foundEvent.organization) ? foundEvent.organization[0] : foundEvent.organization,
                    };
                    setEvent(transformedEvent);
                } else {
                    setEvent(null);
                }
            }
            setLoading(false);
        };
        fetchEventData();
    }, [orgSlug, eventSlug]);


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }
    
    if (!event) {
        return (
             <div className="min-h-screen bg-gray-50 dark:bg-dark-background flex flex-col items-center justify-center text-center p-4">
                <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Event ikke fundet</h1>
                <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Det event, du leder efter, findes ikke eller er blevet fjernet.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-background">
            <PublicAuthModal />
            <div className="max-w-3xl mx-auto p-4 md:p-8">
                 <div className="mb-4">
                    <span className="text-4xl">{event.icon}</span>
                 </div>
                 <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary mb-4">{event.title}</h1>
                 
                 <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-lg mb-6">
                    <PrivateImage src={event.image_url} alt={event.title || 'Event'} className="w-full h-full object-cover" />
                 </div>

                 <div className="space-y-4 text-lg">
                    <div className="flex items-center text-text-secondary dark:text-dark-text-secondary">
                        <Calendar size={20} className="mr-3 text-primary" />
                        <span>{event.time ? new Date(event.time).toLocaleString('da-DK', { dateStyle: 'full', timeStyle: 'short' }) : 'Ukendt tidspunkt'}</span>
                    </div>
                     <div className="flex items-center text-text-secondary dark:text-dark-text-secondary">
                        <MapPin size={20} className="mr-3 text-primary" />
                        <span>{event.address || 'Adresse ikke angivet'}</span>
                    </div>
                 </div>

                 <div className="mt-8 prose dark:prose-invert max-w-none">
                    <p>{event.description}</p>
                 </div>
            </div>
        </div>
    );
};

export default PublicEventPage;