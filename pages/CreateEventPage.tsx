
import React from 'react';
import { Info } from 'lucide-react';

const CreateEventPage: React.FC = () => {
    return (
        <div className="p-6 bg-gray-50 h-full">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">Lav et socialt event</h1>
                <Info className="text-gray-400" size={24} />
            </div>

            <form className="space-y-6">
                <div>
                    <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
                        Navn
                    </label>
                    <input
                        type="text"
                        id="eventName"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="F.eks. Tur i biffen"
                    />
                </div>
                <div>
                    <label htmlFor="eventDescription" className="block text-sm font-medium text-gray-700 mb-1">
                        Beskrivelse
                    </label>
                    <textarea
                        id="eventDescription"
                        rows={5}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Fortæl lidt om hvad I skal lave..."
                    ></textarea>
                </div>
                <div>
                     <button
                        type="submit"
                        className="w-full bg-primary text-white font-bold py-4 px-4 rounded-full text-lg hover:bg-primary-dark transition duration-300 shadow-lg"
                    >
                        Lav event
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateEventPage;
