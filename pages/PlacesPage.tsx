import React, { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Phone, Clock, MapPin, Share2, CheckSquare } from 'lucide-react';
import type { Place, User, MessageThread } from '../types';
import ShareModal from '../components/ShareModal';
import NotificationIcon from '../components/NotificationIcon';

const mockPlaces: Place[] = [
  { id: 1, name: 'Espresso House', offer: '2 x gratis kaffe', address: 'Bispensgade 16, 9000 Aalborg', userCount: 209, userImages: ['https://picsum.photos/id/10/30/30', 'https://picsum.photos/id/20/30/30'], icon: '☕', category: 'Café', description: 'Espresso House er Nordens største kaffebarkæde. Vi støtter kampen mod ensomhed ved at tilbyde et hyggeligt mødested, hvor nye venskaber kan blomstre over en god kop kaffe.', isSponsored: true, phone: '+45 12 34 56 78', openingHours: 'Man-Fre: 07:30 - 19:00' },
  { id: 2, name: 'Heidis bier bar', offer: '25% rabat på hele regningen', address: 'Jomfru Anes Gård 5, 9000 Aalborg', userCount: 151, userImages: ['https://picsum.photos/id/30/30/30', 'https://picsum.photos/id/40/30/30'], icon: '🍻', category: 'Bar', description: 'Kom og oplev ægte afterski-stemning midt i Aalborg! Vi tror på, at fællesskab og fest er den bedste medicin mod ensomhed.', isSponsored: false, phone: '+45 87 65 43 21', openingHours: 'Tors-Lør: 20:00 - 05:00' },
  { id: 3, name: 'McDonalds', offer: 'Gratis cheeseburger ved køb af menu', address: 'Nytorv 2, 9000 Aalborg', userCount: 97, userImages: ['https://picsum.photos/id/50/30/30', 'https://picsum.photos/id/60/30/30'], icon: '🍔', category: 'Restaurant', description: 'Et velkendt og uformelt sted at mødes. Vi støtter lokalsamfundet og vil gerne give en lille ekstra ting til nye venner, der mødes hos os.', isSponsored: true, phone: '+45 98 76 54 32', openingHours: 'Alle dage: 10:00 - 01:00' },
];

const mockSoulmates: MessageThread[] = [
    { id: 1, user: { id: 1, name: 'Anne', age: 24, avatarUrl: 'https://picsum.photos/id/1011/100/100', online: true }, lastMessage: '', timestamp: '', unreadCount: 0 },
    { id: 2, user: { id: 4, name: 'Victoria', age: 25, avatarUrl: 'https://picsum.photos/id/1013/100/100', online: false }, lastMessage: '', timestamp: '', unreadCount: 0 },
    { id: 3, user: { id: 2, name: 'Jens', age: 26, avatarUrl: 'https://picsum.photos/id/1025/100/100', online: true }, lastMessage: '', timestamp: '', unreadCount: 0 },
];

const PlaceCard: React.FC<{ place: Place }> = ({ place }) => (
  <div className="bg-teal-100 p-4 rounded-2xl shadow-sm h-full cursor-pointer hover:shadow-lg transition-shadow">
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

const PlaceDetailModal: React.FC<{ place: Place, onClose: () => void, onShare: () => void }> = ({ place, onClose, onShare }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center md:justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-6 relative max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-gray-300 rounded-full md:hidden"></div>
        
        <header className="text-center mt-4 mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold text-text-primary">
            I kampen sammen om ensomhed tilbyder <br/> <span className="text-primary">{place.name}</span> jer
          </h2>
        </header>

        <main className="overflow-y-auto pb-4">
            <div className="mb-6 space-y-3">
              <h3 className="text-lg font-bold text-text-primary border-b pb-2 mb-2">Detaljer om mødetilbuddet</h3>
              <p className="font-bold text-lg text-primary">{place.offer}</p>
              <p className="text-sm text-gray-600">{place.description}</p>
              <div className={`text-sm font-bold p-2 rounded-lg text-center ${place.isSponsored ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                Sponsoreret: {place.isSponsored ? 'JA' : 'NEJ'}
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <h3 className="text-lg font-bold text-text-primary border-b pb-2 mb-2">Kontaktinformation</h3>
              <div className="flex items-center text-gray-700">
                <Phone size={18} className="mr-3 text-primary flex-shrink-0" />
                <span>{place.phone}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Clock size={18} className="mr-3 text-primary flex-shrink-0" />
                <span>{place.openingHours}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <MapPin size={18} className="mr-3 text-primary flex-shrink-0" />
                <span>{place.address}</span>
              </div>
            </div>
        </main>
        
        <footer className="space-y-3 border-t pt-4 mt-auto flex-shrink-0">
          <button onClick={onShare} className="w-full bg-primary-light text-primary font-bold py-3 px-4 rounded-full text-lg transition duration-300 flex items-center justify-center hover:bg-primary/20">
            <Share2 size={20} className="mr-2"/> Del med SoulMate
          </button>
          <button 
            onClick={() => navigate('/checkin', { state: { place } })}
            className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full text-lg transition duration-300 shadow-lg hover:bg-primary-dark flex items-center justify-center"
          >
            <CheckSquare size={20} className="mr-2"/> Check ind
          </button>
        </footer>
      </div>
    </div>
  );
};


const PlacesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareConfirmation, setShareConfirmation] = useState('');

  const filteredPlaces = useMemo(() => {
    if (!selectedCategory) {
      return mockPlaces;
    }
    return mockPlaces.filter(place => place.category === selectedCategory);
  }, [selectedCategory]);
  
  const handleShare = (user: User) => {
    setShowShareModal(false);
    setShareConfirmation(`Sted delt med ${user.name}!`);
    setTimeout(() => setShareConfirmation(''), 3000);
  };


  return (
    <div className="p-4 md:p-6 relative">
       <div className="flex justify-between items-center mb-4">
        <div className="w-10"></div> {/* Spacer */}
        <h1 className="text-2xl font-bold text-primary">SoulMatch</h1>
        <NotificationIcon />
      </div>
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
        <Link to="/places/filter" className="p-2 bg-gray-100 rounded-md">
            <SlidersHorizontal className="text-gray-600" />
        </Link>
      </div>

      {selectedCategory && (
        <div className="inline-flex items-center bg-primary-light text-primary-dark font-semibold px-3 py-1.5 rounded-full mb-4 text-sm">
          <span>Filter: {selectedCategory}</span>
          <button onClick={() => setSearchParams({})} className="ml-2 p-1 -mr-1 hover:bg-primary/20 rounded-full">
            <X size={16} />
          </button>
        </div>
      )}

      <div>
        {filteredPlaces.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlaces.map(place => (
              <div key={place.id} onClick={() => setSelectedPlace(place)}>
                  <PlaceCard place={place} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-text-secondary mt-8">Ingen steder fundet for den valgte kategori.</p>
        )}
      </div>

      {selectedPlace && (
        <PlaceDetailModal 
            place={selectedPlace} 
            onClose={() => setSelectedPlace(null)}
            onShare={() => setShowShareModal(true)}
        />
      )}
      {showShareModal && (
        <ShareModal 
            title="Del sted med en Soulmate"
            soulmates={mockSoulmates}
            onShare={handleShare}
            onClose={() => setShowShareModal(false)}
        />
      )}
       {shareConfirmation && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-bold py-2 px-4 rounded-full z-50">
              {shareConfirmation}
          </div>
      )}
    </div>
  );
};

export default PlacesPage;