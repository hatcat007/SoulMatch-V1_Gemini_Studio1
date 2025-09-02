import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, MessageCircle, ChevronRight } from 'lucide-react';
import type { Organization, MessageThread, User } from '../types';
import ShareModal from '../components/ShareModal';

// --- MOCK DATA ---
const mockOrganizations: Organization[] = [
  {
    id: 1,
    name: 'SIND Ungdom Aalborg',
    logoUrl: 'https://i.imgur.com/8S8V5c2.png',
    address: 'Danmarksgade 52, Aalborg, Denmark',
    description: 'SIND Ungdom i Aalborg er et klubtilbud for unge psykisk sårbare i alderen 16-35 år.',
    opportunities: [
      { name: 'Fællesspisning', icon: '🍽️' },
      { name: 'Brætspil', icon: '🎲' },
      { name: 'Fælles snak', icon: '💬' },
      { name: 'Kreativt værksted', icon: '🎨' },
    ],
    updates: [
      { id: 1, imageUrl: 'https://i.imgur.com/K0uX4p5.png' },
      { id: 2, imageUrl: 'https://i.imgur.com/5lGqYJ0.png' },
      { id: 3, imageUrl: 'https://i.imgur.com/JjFq2Q0.png' },
      { id: 4, imageUrl: 'https://i.imgur.com/yFfJ9w9.png' },
    ],
  },
   {
    id: 2,
    name: 'Studenterhuset Aalborg',
    logoUrl: 'https://i.imgur.com/fL5FfJ4.png',
    address: 'Gammeltorv 10, 9000 Aalborg',
    description: 'Aalborgs internationale studenterhus. Vi arrangerer koncerter, debatter, fester og meget mere.',
    opportunities: [
      { name: 'Koncerter', icon: '🎸' },
      { name: 'Debatter', icon: '🎙️' },
      { name: 'Fællesskab', icon: '👥' },
    ],
    updates: [],
  },
  {
    id: 3,
    name: 'Ventilen Aalborg',
    logoUrl: 'https://i.imgur.com/h5r8uGk.png',
    address: 'Kirkegårdsgade 2, 9000 Aalborg',
    description: 'Et mødested for unge, der føler sig ensomme. Her kan du møde andre unge og være en del af et fællesskab.',
    opportunities: [
      { name: 'Brætspil', icon: '🎲' },
      { name: 'Filmhygge', icon: '🎬' },
      { name: 'Madlavning', icon: '🍳' },
    ],
    updates: [],
  }
];

const mockSoulmates: MessageThread[] = [
    { id: 1, user: { id: 1, name: 'Anne', age: 24, avatarUrl: 'https://picsum.photos/id/1011/100/100', online: true }, lastMessage: '', timestamp: '', unreadCount: 0 },
    { id: 2, user: { id: 4, name: 'Victoria', age: 25, avatarUrl: 'https://picsum.photos/id/1013/100/100', online: false }, lastMessage: '', timestamp: '', unreadCount: 0 },
];
// --- END MOCK DATA ---

const OrganizationProfilePage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareConfirmation, setShareConfirmation] = useState('');

  const organization = mockOrganizations.find(o => o.id.toString() === organizationId);

  if (!organization) {
    return (
      <div className="p-4 text-center">
        <p>Organization not found.</p>
        <button onClick={() => navigate('/home')} className="text-primary mt-4">Back to home</button>
      </div>
    );
  }
  
  const handleShare = (user: User) => {
    setShowShareModal(false);
    setShareConfirmation(`Profil delt med ${user.name}!`);
    setTimeout(() => setShareConfirmation(''), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-background md:bg-white">
      {showShareModal && (
        <ShareModal 
            title={`Del ${organization.name}`}
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

      {/* Header */}
      <header className="flex-shrink-0 bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2" aria-label="Go back">
            <ArrowLeft size={24} className="text-text-primary" />
          </button>
          <h1 className="text-xl font-bold text-primary">SoulMatch</h1>
          <button className="p-2 -mr-2" aria-label="More options">
            <MoreVertical size={24} className="text-text-primary" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-8">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          
          {/* Organization Info */}
          <section className="mb-8 md:flex md:items-start md:space-x-6">
            <div className="flex-shrink-0 flex justify-center mb-4 md:mb-0">
              <img src={organization.logoUrl} alt={`${organization.name} logo`} className="w-24 h-24 object-contain" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-text-primary">{organization.name}</h2>
              <p className="text-primary font-semibold">{organization.address}</p>
              <div className="mt-2 flex items-start space-x-4">
                <p className="text-text-secondary flex-1">{organization.description}</p>
                <button className="p-3 border border-gray-300 rounded-full text-gray-600 flex-shrink-0" aria-label="Chat with organization">
                  <MessageCircle size={20} />
                </button>
              </div>
            </div>
          </section>

          {/* Opportunities */}
          <section className="mb-8">
            <div className="border-t border-b border-gray-200 py-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-text-primary">Mulighed for</h3>
                <ChevronRight size={24} className="text-gray-400" />
              </div>
              <div className="flex space-x-4 overflow-x-auto pb-2 -mb-2">
                {organization.opportunities.map((op, index) => (
                  <div key={index} className="flex flex-col items-center text-center flex-shrink-0 w-24">
                    <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center text-3xl mb-2">
                      {op.icon}
                    </div>
                    <p className="text-sm font-semibold text-text-primary">{op.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Updates */}
          <section>
            <h3 className="text-xl font-bold text-text-primary mb-4">Nye opdateringer</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {organization.updates.map(update => (
                <div key={update.id} className="aspect-square">
                  <img src={update.imageUrl} alt={`Update ${update.id}`} className="w-full h-full object-cover rounded-lg shadow-md" />
                </div>
              ))}
              <div 
                className="aspect-square bg-primary text-white rounded-lg shadow-md flex items-center justify-center text-center p-4 cursor-pointer hover:bg-primary-dark transition-colors"
                onClick={() => setShowShareModal(true)}
                >
                <h4 className="text-xl font-bold">Del med soulmate 😎</h4>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default OrganizationProfilePage;