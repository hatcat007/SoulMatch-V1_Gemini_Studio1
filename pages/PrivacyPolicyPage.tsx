import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-background">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary" aria-label="Gå tilbage">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Privatlivspolitik</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto text-text-secondary dark:text-dark-text-secondary prose dark:prose-invert">
                    <h2 className="text-text-primary dark:text-dark-text-primary">Introduktion</h2>
                    <p>Hos SoulMatch er dit privatliv og din sikkerhed af yderste vigtighed for os. Denne privatlivspolitik forklarer, hvilke personoplysninger vi indsamler, hvordan vi bruger dem, og hvilke rettigheder du har.</p>

                    <h2 className="text-text-primary dark:text-dark-text-primary">Data vi indsamler</h2>
                    <ul>
                        <li><strong>Identifikationsoplysninger:</strong> For at sikre en tryg platform verificerer vi alle brugere via MitID. Vi gemmer ikke dit CPR-nummer, men modtager en bekræftelse af din identitet.</li>
                        <li><strong>Profiloplysninger:</strong> Oplysninger du selv angiver, såsom navn, alder, interesser, billeder og personlighedsanalysens resultater.</li>
                        <li><strong>Ansigtsgodkendelse:</strong> Vi bruger biometriske data til at verificere, at dit profilbillede matcher dig som person. Disse data bruges udelukkende til verifikation.</li>
                        <li><strong>Brugeradfærd:</strong> Vi analyserer anonymiseret data om, hvordan appen bruges, for at forbedre funktioner og brugeroplevelse.</li>
                    </ul>

                    <h2 className="text-text-primary dark:text-dark-text-primary">Hvordan vi bruger dine data</h2>
                    <ul>
                        <li>Til at levere og forbedre vores matchmaking-tjenester.</li>
                        <li>Til at sikre platformens sikkerhed og forhindre misbrug.</li>
                        <li>Til at kommunikere med dig om opdateringer eller vigtig information.</li>
                        <li>Til anonymiseret analyse for at forstå ensomhedsproblematikken bedre og forbedre vores sociale mission.</li>
                    </ul>

                    <h2 className="text-text-primary dark:text-dark-text-primary">Deling af data</h2>
                    <p>Vi deler eller sælger aldrig dine personlige oplysninger til tredjeparter for kommercielle formål. Da SoulMatch er en non-profit, er vores eneste fokus at skabe værdi for samfundet.</p>

                    <h2 className="text-text-primary dark:text-dark-text-primary">Dine rettigheder</h2>
                    <p>Du har til enhver tid ret til at anmode om indsigt i, rettelse af eller sletning af dine personoplysninger. Du kan administrere de fleste af dine oplysninger direkte i appen under din profil.</p>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicyPage;
