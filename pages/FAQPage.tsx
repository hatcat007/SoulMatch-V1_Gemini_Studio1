import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';

const faqData = [
  {
    question: "Hvad er SoulMatch?",
    answer: "SoulMatch er en innovativ app designet til at bekæmpe ensomhed i Danmark. Vi faciliterer meningsfulde fællesskaber og trygge, fysiske møder mellem mennesker ved hjælp af avanceret AI-teknologi og en central database over sociale tilbud."
  },
  {
    question: "Hvordan fungerer matching?",
    answer: "Vores AI-system matcher brugere baseret på en bred vifte af kriterier, herunder personlighed (inspireret af Big Five-modellen), interesser, hobbyer, kultur og meget mere. Målet er at skabe dybe og meningsfulde forbindelser."
  },
  {
    question: "Hvad er 3-dages chatgrænsen?",
    answer: "For at opfordre til fysiske møder slettes en chatforbindelse automatisk efter 3 dage, medmindre brugerne mødes og bekræfter mødet via NFC-teknologi i appen. Dette understreger vores motto: 'Gem mobilen væk, og vær sammen som mennesker'."
  },
  {
    question: "Er det sikkert at bruge SoulMatch?",
    answer: "Sikkerhed er vores højeste prioritet. Alle brugere skal verificeres med MitID for at sikre ægte identiteter. Vi har også funktioner som ansigtsgodkendelse, et robust rapporteringssystem og en kommende SOS-funktion for at skabe et trygt miljø."
  },
  {
    question: "Hvad koster det at bruge appen?",
    answer: "Det er gratis at oprette en profil og bruge de grundlæggende funktioner i SoulMatch. Vores mission er non-profit og fokuseret på social effekt frem for profit."
  },
];

const AccordionItem: React.FC<{ item: typeof faqData[0]; isOpen: boolean; onClick: () => void; }> = ({ item, isOpen, onClick }) => (
  <div className="border-b border-gray-200 dark:border-dark-border">
    <button
      onClick={onClick}
      className="w-full flex justify-between items-center text-left p-4 focus:outline-none"
    >
      <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">{item.question}</h3>
      <ChevronDown
        className={`w-6 h-6 text-primary transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`}
      />
    </button>
    {isOpen && (
      <div className="p-4 pt-0">
        <p className="text-text-secondary dark:text-dark-text-secondary">{item.answer}</p>
      </div>
    )}
  </div>
);

const FAQPage: React.FC = () => {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Ofte Stillede Spørgsmål</h1>
        <div className="w-8"></div> {/* Spacer */}
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-dark-surface rounded-lg shadow-sm">
          {faqData.map((item, index) => (
            <AccordionItem
              key={index}
              item={item}
              isOpen={openIndex === index}
              onClick={() => handleToggle(index)}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default FAQPage;
