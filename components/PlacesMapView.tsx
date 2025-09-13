import React, { useEffect, useRef, useState } from 'react';
import type { Place } from '../types';
import { Search, LocateFixed, Loader2, AlertTriangle } from 'lucide-react';

// Declare Leaflet in the global scope to satisfy TypeScript
declare const L: any;

interface PlacesMapViewProps {
    places: Place[];
}

const PlacesMapView: React.FC<PlacesMapViewProps> = ({ places }) => {
    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<any[]>([]);
    
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Initialize map
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current).setView([56.2639, 9.5018], 7); // Default to Denmark
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            mapRef.current = map;

            // Get user's location
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const loc: [number, number] = [latitude, longitude];
                    setUserLocation(loc);
                    map.setView(loc, 13);
                },
                () => {
                    console.warn("Geolocation permission denied. Defaulting to Copenhagen.");
                    setLocationError("Giv venligst adgang til din lokation for den bedste oplevelse.");
                    map.setView([55.6761, 12.5683], 12); // Copenhagen
                }
            );
        }

        return () => {
            if (mapRef.current) {
                try {
                    mapRef.current.remove();
                } catch (e) {
                    console.error("Could not remove map on cleanup:", e);
                }
                mapRef.current = null;
            }
        };
    }, []);

    // Update markers when places change
    useEffect(() => {
        if (!mapRef.current) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        const placesWithCoords = places.filter(p => p.latitude != null && p.longitude != null);

        placesWithCoords.forEach(place => {
            const iconHtml = `<div style="font-size: 28px; text-shadow: 2px 2px 5px rgba(0,0,0,0.4);">${place.icon || '📍'}</div>`;
            const customIcon = L.divIcon({
                html: iconHtml,
                className: 'custom-map-icon', // Empty class, styling is inline for simplicity
                iconSize: [30, 42],
                iconAnchor: [15, 42],
                popupAnchor: [0, -42]
            });

             const popupContent = `
                <div style="font-family: 'Nunito', sans-serif; width: 200px; line-height: 1.5;">
                    <div style="font-weight: 700; font-size: 16px; color: #212529; margin-bottom: 4px;">${place.name}</div>
                    <div style="font-size: 14px; color: #006B76; font-weight: 600; margin-bottom: 8px;">${place.offer}</div>
                    <p style="font-size: 12px; color: #6C757D; margin: 0 0 12px 0; white-space: normal;">${place.address}</p>
                    <a href="#/place/${place.id}" style="display: block; text-align: center; background-color: #006B76; color: white; padding: 8px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px;">
                        Se Mere
                    </a>
                </div>
            `;

            const marker = L.marker([place.latitude!, place.longitude!], { icon: customIcon })
                .addTo(mapRef.current)
                .bindPopup(popupContent);

            markersRef.current.push(marker);
        });
        
    }, [places]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !mapRef.current) return;
        setIsSearching(true);
        setSearchError(null);
        setLocationError(null);

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}, Denmark`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 12);
            } else {
                setSearchError('By ikke fundet. Prøv igen.');
            }
        } catch (error) {
            setSearchError('Søgning fejlede. Tjek din internetforbindelse.');
        } finally {
            setIsSearching(false);
        }
    };
    
    const reCenter = () => {
        setLocationError(null);
        setSearchError(null);
        
        if (userLocation && mapRef.current) {
            mapRef.current.setView(userLocation, 13);
        } else if (mapRef.current) {
             navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const loc: [number, number] = [latitude, longitude];
                    setUserLocation(loc);
                    if (mapRef.current) {
                        mapRef.current.setView(loc, 13);
                    }
                },
                (error) => {
                    let message = "Kunne ikke hente din position.";
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            message = "Du har afvist anmodningen om lokationstilladelse.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = "Lokationsinformation er ikke tilgængelig.";
                            break;
                        case error.TIMEOUT:
                            message = "Anmodningen om at hente din lokation timede ud.";
                            break;
                        default:
                            message = "Der opstod en ukendt fejl.";
                            break;
                    }
                    setLocationError(message + " Tjek dine browserindstillinger.");
                }
            );
        }
    };

    return (
        <div className="mb-6 relative h-[400px] md:h-[500px] w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-dark-border">
            <div ref={mapContainerRef} className="h-full w-full bg-gray-100" id="map-view"></div>
            <div className="absolute top-4 left-4 right-4 z-[1000]">
                <div className="bg-white dark:bg-dark-surface p-2 rounded-full shadow-md flex items-center gap-2 focus-within:ring-2 focus-within:ring-primary transition-all duration-300">
                    <form onSubmit={handleSearch} className="flex-grow flex items-center">
                        <Search className="w-5 h-5 text-gray-400 dark:text-dark-text-secondary mx-2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Søg efter by..."
                            className="w-full bg-transparent focus:outline-none text-text-primary dark:text-dark-text-primary placeholder-text-secondary"
                        />
                         {isSearching && <Loader2 className="animate-spin text-primary mr-2"/>}
                    </form>
                    <button
                        onClick={reCenter}
                        className="p-2.5 bg-primary-light dark:bg-dark-surface-light rounded-full text-primary hover:bg-primary/20 transition-colors"
                        title="Centrer på min position"
                        aria-label="Centrer på min position"
                    >
                        <LocateFixed size={18} />
                    </button>
                </div>
            </div>
             {(searchError || locationError) && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-4 py-2 rounded-full text-sm font-semibold flex items-center shadow-lg">
                    <AlertTriangle size={16} className="mr-2"/>
                    {searchError || locationError}
                </div>
            )}
        </div>
    );
};

export default PlacesMapView;