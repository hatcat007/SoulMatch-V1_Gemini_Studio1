import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfServicePage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Servicevilkår</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto text-text-secondary dark:text-dark-text-secondary prose dark:prose-invert">
                    <p>Velkommen til SoulMatch! Ved at bruge vores applikation accepterer du at overholde følgende vilkår og betingelser.</p>

                    <h2 className="text-text-primary dark:text-dark-text-primary">1. Brugeradfærd</h2>
                    <p>Du accepterer at opføre dig respektfuldt og hensynsfuldt over for andre brugere. Chikane, hadtale, trusler eller enhver form for upassende adfærd tolereres ikke og vil medføre permanent udelukkelse fra platformen.</p>

                    <h2 className="text-text-primary dark:text-dark-text-primary">2. Alderskrav</h2>
                    <p>Du skal være mindst 16 år for at oprette en profil og bruge SoulMatch. Vi henvender os primært til unge i alderen 16-24 år, men alle over 16, der søger meningsfulde fællesskaber, er velkomne.</p>

                    <h2 className="text-text-primary dark:text-dark-text-primary">3. Kontosikkerhed</h2>
                    <p>Du er ansvarlig for at holde din konto sikker. Dette inkluderer at bruge en stærk adgangskode og ikke dele dine loginoplysninger med andre. Verifikation via MitID er obligatorisk for at sikre et trygt miljø.</p>

                    <h2 className="text-text-primary dark:text-dark-text-primary">4. Rapporteringssystem</h2>
                    <p>Vi har et strengt rapporteringssystem. Hvis en bruger modtager to berettigede anklager for upassende opførsel, vil vedkommende blive permanent udelukket. Alvorlige anklager med beviser kan føre til øjeblikkelig udelukkelse og politianmeldelse.</p>

                    <h2 className="text-text-primary dark:text-dark-text-primary">5. Ansvarsfraskrivelse</h2>
                    <p>SoulMatch faciliterer kontakt mellem mennesker, men vi er ikke ansvarlige for interaktioner, der finder sted uden for vores platform. Vi opfordrer alle til at udvise forsigtighed og mødes på offentlige steder de første par gange.</p>
                </div>
            </main>
        </div>
    );
};

export default TermsOfServicePage;
