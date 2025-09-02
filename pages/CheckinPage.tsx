import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import IconCloud from '../components/magicui/IconCloud';
import NFCAnimation from '../components/NFCAnimation';
import type { Place } from '../types';

const CheckinPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isConnecting, setIsConnecting] = useState(false);
  
  const place = location.state?.place as Place | undefined;

  // Avatars for the icon cloud
  const iconCloudImages = [
    'https://i.pravatar.cc/80?u=a1',
    'https://i.pravatar.cc/80?u=a2',
    'https://i.pravatar.cc/80?u=a3',
    'https://i.pravatar.cc/80?u=a4',
    'https://i.pravatar.cc/80?u=a5',
    'https://i.pravatar.cc/80?u=a6',
    'https://i.pravatar.cc/80?u=a7',
    'https://i.pravatar.cc/80?u=a8',
  ];
  
  const handleConnectionComplete = () => {
    // Navigate back after a delay to allow the user to see the "complete" state
    setTimeout(() => {
      navigate(-1);
    }, 4000); // 4 seconds delay
  };

  if (isConnecting) {
    return <NFCAnimation discountOffer={place?.offer} onConnectionComplete={handleConnectionComplete} />;
  }


  return (
    <div className="flex flex-col h-full bg-white p-6 justify-between text-center">
      <header className="absolute top-4 left-4 z-30">
        <span className="bg-white text-text-primary text-sm font-semibold px-3 py-1 rounded-md shadow">
          Rabat kupon
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center">
        {/* Central Graphic */}
        <div className="relative w-80 h-80 mb-10 flex items-center justify-center">
          <IconCloud images={iconCloudImages} />
          <img 
            src="https://i.imgur.com/qC9gY8V.png" 
            alt="Two phones touching"
            className="absolute w-40 h-auto z-10"
          />
        </div>

        <h1 className="text-3xl font-bold text-text-primary mb-4">Rabat kupon når i mødes</h1>
        <p className="text-text-secondary text-base px-4">
          Placere nu jeres telefoner op ad hinanden og tryk "Forsæt"
        </p>
      </main>

      <footer className="flex-shrink-0">
        <button
          onClick={() => setIsConnecting(true)}
          className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
        >
          Fortsæt
        </button>
      </footer>
    </div>
  );
};

export default CheckinPage;