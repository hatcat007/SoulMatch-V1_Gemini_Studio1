
import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { Place } from '../types';

const mockPlaces: Place[] = [
  { id: 1, name: 'Espresso House', offer: '2 x gratis kaffe', address: 'Bispensgade 16, 9000 Aalborg', userCount: 209, userImages: ['https://picsum.photos/id/10/30/30', 'https://picsum.photos/id/20/30/30'], icon: '☕' },
  { id: 2, name: 'Heidis bier bar', offer: '25% rabat', address: 'Jomfru Anes Gård 5, 9000 Aalborg', userCount: 151, userImages: ['https://picsum.photos/id/30/30/30', 'https://picsum.photos/id/40/30/30'], icon: '🍻' },
  { id: 3, name: 'McDonalds', offer: '2 x cola + cheeseburger', address: 'Jomfru Anes Gård 5, 9000 Aalborg', userCount: 97, userImages: ['https://picsum.photos/id/50/30/30', 'https://picsum.photos/id/60/30/30'], icon: '🍔' },
];

const PlaceCard: React.FC<{ place: Place }> = ({ place }) => (
  <div className="bg-teal-100 p-4 rounded-2xl shadow-sm mb-4">
    <div className="flex justify-between items-start">
      <div>
        <p className="font-semibold text-teal-800">{place.offer}</p>
        <h3 className="text-2xl font-bold text-text-primary">{place.name}</h3>
      </div>
      <div className="text-4xl bg-white p-2 rounded-full">{place.icon}</div>
    </div>
    <div className="mt-4">
        <div className="flex items-center">
            <div className="flex -space-x-2 mr-2">
                {place.userImages.map((src, index) => (
                    <img key={index} src={src} alt="user" className="w-8 h-8 rounded-full border-2 border-white"/>
                ))}
            </div>
            <p className="text-sm text-teal-700">{place.userCount} har mødes her</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">{place.address}</p>
    </div>
  </div>
);


const PlacesPage: React.FC = () => {
  return (
    <div className="p-4">
      <div className="relative mb-4">
        <input 
          type="text" 
          placeholder="Søg på dine ønsker. Fx Kaffe eller Øl" 
          className="w-full bg-gray-100 border border-gray-200 rounded-full py-3 pl-10 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
      </div>
      <div className="flex justify-between items-center mb-4">
        <div>
            <h2 className="text-2xl font-bold text-text-primary">Steder at mødes</h2>
            <p className="text-text-secondary text-sm">Valgt baseret på din lokation</p>
        </div>
        <button className="p-2 bg-gray-100 rounded-md">
            <SlidersHorizontal className="text-gray-600" />
        </button>
      </div>

      <div>
        {mockPlaces.map(place => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>
    </div>
  );
};

export default PlacesPage;
