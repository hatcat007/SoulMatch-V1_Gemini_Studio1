import React from 'react';
import PersonalityTest from '../components/PersonalityTest';

interface PersonalityTestPageProps {
    onTestComplete: () => void;
}

const PersonalityTestPage: React.FC<PersonalityTestPageProps> = ({ onTestComplete }) => {
    return <PersonalityTest onTestComplete={onTestComplete} />;
};

export default PersonalityTestPage;
