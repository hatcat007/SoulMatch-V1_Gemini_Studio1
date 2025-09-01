
import React from 'react';
import { useNavigate } from 'react-router-dom';

const CheckinPage: React.FC = () => {
  const navigate = useNavigate();

  // Mock avatars for the orbiting effect
  const orbitingAvatars = [
    'https://i.pravatar.cc/80?u=a1',
    'https://i.pravatar.cc/80?u=a2',
    'https://i.pravatar.cc/80?u=a3',
    'https://i.pravatar.cc/80?u=a4',
    'https://i.pravatar.cc/80?u=a5',
  ];

  return (
    <div className="flex flex-col h-full bg-white p-6 justify-between text-center">
      <header className="absolute top-4 left-4 z-30">
        <span className="bg-white text-text-primary text-sm font-semibold px-3 py-1 rounded-md shadow">
          Rabat kupon
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center">
        {/* Central Graphic */}
        <div className="relative w-64 h-64 mb-10 flex items-center justify-center">
          <div className="absolute w-56 h-56 bg-primary-light rounded-full"></div>
          {/* Placeholder for the complex phone graphic from the screenshot */}
          <img
            src="https://i.imgur.com/8Q5dZ1r.png"
            alt="Digital Connection"
            className="relative z-10 w-48 object-contain"
          />
          {/* Orbiting Avatars */}
          <img src={orbitingAvatars[0]} alt="User" className="w-12 h-12 rounded-full absolute top-0 left-8 z-20 shadow-lg" />
          <img src={orbitingAvatars[1]} alt="User" className="w-14 h-14 rounded-full absolute top-10 right-0 z-20 shadow-lg" />
          <img src={orbitingAvatars[2]} alt="User" className="w-10 h-10 rounded-full absolute bottom-4 right-4 z-20 shadow-lg" />
          <img src={orbitingAvatars[3]} alt="User" className="w-12 h-12 rounded-full absolute bottom-12 left-0 z-20 shadow-lg" />
          <img src={orbitingAvatars[4]} alt="User" className="w-8 h-8 rounded-full absolute top-20 -left-4 z-20 shadow-lg" />
        </div>

        <h1 className="text-3xl font-bold text-text-primary mb-4">Rabat kupon når i mødes</h1>
        <p className="text-text-secondary text-base mb-2 px-4">
          Foredele når i mødes via. appen via. lokation.
        </p>
        <p className="text-text-secondary text-base px-4">
          Nu placere du bare jeres telefoner på hinanden og WUPTI DUPTI, 2 rabatkoder venter nu på at bruges.🥳🥳🥳
        </p>
      </main>

      <footer className="flex-shrink-0">
        <button
          onClick={() => navigate(-1)} // Navigates back for now
          className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
        >
          Fortsæt
        </button>
        <p className="mt-4 text-text-secondary">
          Har du allerede en bruger? <button onClick={() => navigate('/login')} className="font-bold text-primary">Log ind</button>
        </p>
      </footer>
    </div>
  );
};

export default CheckinPage;
