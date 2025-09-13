import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ImageIcon, Users, Award } from 'lucide-react';
import type { Place } from '../types';
import NotificationIcon from '../components/NotificationIcon';
import { fetchPrivateFile } from '../services/s3Service';
import PlacesMapView from '../components/PlacesMapView';

interface PlacesPageProps {
    places: Place[];
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
            });
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


const PlaceCard: React.FC<{ place: Place }> = ({ place }) => {
    const tags = useMemo(() => {
        const activityNames = place.place_activities?.map(pa => pa.activity.name) || [];
        const interestNames = place.place_interests?.map(pi => pi.interest.name) || [];
        return [...new Set([...activityNames, ...interestNames])];
    }, [place.place_activities, place.place_interests]);

    return (
        <Link to={`/place/${place.id}`} className="block bg-white dark:bg-dark-surface p-4 rounded-2xl shadow-sm h-full cursor-pointer hover:shadow-lg transition-shadow flex flex-col sm:flex-row items-start sm:items-center">
            <div className="w-20 h-20 flex-shrink-0 mr-4 mb-3 sm:mb-0">
                 <PrivateImage src={place.image_url} alt={place.name} className="w-full h-full object-cover rounded-lg" />
            </div>
            <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold text-primary">{place.offer}</p>
                        <h3 className="text-lg font-bold text-text-primary dark:text-dark-text-primary line-clamp-2">{place.name}</h3>
                    </div>
                    {place.is_certified && (
                        <div className="flex-shrink-0 flex items-center bg-yellow-100 text-yellow-800 font-semibold px-2 py-1 rounded-full text-xs">
                            <Award size={14} className="mr-1.5" />
                            Certificeret
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{place.address}</p>
                <div className="flex items-center text-xs text-text-secondary dark:text-dark-text-secondary mt-2 space-x-3">
                    <p className="font-semibold">{place.category?.name || 'Ukendt'}</p>
                    {place.user_count > 0 && (
                        <div className="flex items-center text-gray-500 dark:text-dark-text-secondary/80">
                            <Users size={14} className="mr-1" />
                            <span className="font-medium">Ca. {place.user_count}</span>
                        </div>
                    )}
                </div>
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map(tag => (
                            <span key={tag} className="bg-gray-100 dark:bg-dark-surface-light text-text-secondary dark:text-dark-text-secondary px-2 py-1 rounded-md text-xs font-medium">{tag}</span>
                        ))}
                    </div>
                )}
            </div>
        </Link>
    );
};

const PlacesPage: React.FC<PlacesPageProps> = ({ places }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const selectedCategoryId = searchParams.get('category_id');
    const navigate = useNavigate();

    useEffect(() => {
        const placeIdToOpen = searchParams.get('open');
        if (placeIdToOpen) {
            navigate(`/place/${placeIdToOpen}`, { replace: true });
        }
    }, [searchParams, navigate]);

    const filteredPlaces = useMemo(() => {
        let placesToFilter = places;

        if (selectedCategoryId) {
            const categoryIdNum = parseInt(selectedCategoryId, 10);
            // FIX: The filtering logic is now more robust. It checks both the joined category object
            // and the direct foreign key ID. This prevents errors if the data structure is inconsistent
            // and ensures the category filter works reliably.
            placesToFilter = placesToFilter.filter(place => {
                return place.category?.id === categoryIdNum || place.category_id === categoryIdNum;
            });
        }

        if (searchTerm.trim()) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            placesToFilter = placesToFilter.filter(place => {
                const nameMatch = place.name.toLowerCase().includes(lowerCaseSearch);
                const descMatch = place.description.toLowerCase().includes(lowerCaseSearch);
                const activityMatch = place.place_activities?.some(pa => pa.activity.name.toLowerCase().includes(lowerCaseSearch));
                const interestMatch = place.place_interests?.some(pi => pi.interest.name.toLowerCase().includes(lowerCaseSearch));
                return nameMatch || descMatch || activityMatch || interestMatch;
            });
        }
        return placesToFilter;
    }, [selectedCategoryId, places, searchTerm]);
    
    const selectedCategoryName = useMemo(() => {
        if (!selectedCategoryId) return null;
        const categoryIdNum = parseInt(selectedCategoryId, 10);
        const placeWithCategory = places.find(p => p.category?.id === categoryIdNum || p.category_id === categoryIdNum);
        return placeWithCategory?.category?.name || null;
    }, [selectedCategoryId, places]);

    return (
        <div className="p-4 md:p-6 relative">
           <div className="flex justify-between items-center mb-4">
                <div className="w-10"></div> {/* Spacer */}
                <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
                <NotificationIcon />
            </div>

            <PlacesMapView places={filteredPlaces} />
            
            <div className="relative mb-4">
                <input 
                    type="text" 
                    placeholder="Søg på steder, aktiviteter eller interesser..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-dark-surface-light border border-gray-200 dark:border-dark-border rounded-full py-3 pl-10 pr-4 text-gray-700 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Steder at mødes</h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary text-sm">Valgt baseret på din lokation</p>
                </div>
                <Link to="/places/filter" className="p-2 bg-gray-100 dark:bg-dark-surface-light rounded-md">
                    <SlidersHorizontal className="text-gray-600 dark:text-dark-text-primary" />
                </Link>
            </div>

            {selectedCategoryId && selectedCategoryName && (
                <div className="inline-flex items-center bg-primary-light text-primary-dark font-semibold px-3 py-1.5 rounded-full mb-4 text-sm">
                    <span>Filter: {selectedCategoryName}</span>
                    <button onClick={() => setSearchParams({})} className="ml-2 p-1 -mr-1 hover:bg-primary/20 rounded-full">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div>
                {filteredPlaces.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                        {filteredPlaces.map(place => (
                            <PlaceCard key={place.id} place={place} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-text-secondary dark:text-dark-text-secondary mt-8">Ingen steder fundet for den valgte kategori.</p>
                )}
            </div>
        </div>
    );
};

export default PlacesPage;