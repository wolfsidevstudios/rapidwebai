import React, { useState } from 'react';

// --- Icon Components ---
const LeftArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);
const RightArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
);
const LightbulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

export interface Suggestion {
    title: string;
    description: string;
    prompt: string;
}

interface GeneratingPreviewProps {
    initialPrompt: string;
    suggestions: Suggestion[];
    onAddToChat: (prompt: string) => void;
}

const GeneratingPreview: React.FC<GeneratingPreviewProps> = ({ initialPrompt, suggestions, onAddToChat }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % (suggestions.length || 1));
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + (suggestions.length || 1)) % (suggestions.length || 1));
    };
    
    const currentSuggestion = suggestions[currentIndex];

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 text-gray-800 p-8 text-center font-sans">
            <h1 className="text-3xl font-bold mb-4">Creating "{initialPrompt}"</h1>
            <p className="text-gray-600 mb-8">The AI is building your app. While you wait, here are some features you could add next:</p>

            <div className="relative w-full max-w-md h-80 flex items-center justify-center">
                {suggestions.length > 0 ? (
                    <>
                        <button onClick={handlePrev} className="absolute left-0 z-10 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors">
                            <LeftArrowIcon />
                        </button>
                        
                        {suggestions.map((suggestion, index) => {
                             const offset = index - currentIndex;
                             const scale = offset === 0 ? 1 : 0.85;
                             const opacity = offset === 0 ? 1 : 0;
                             const zIndex = suggestions.length - Math.abs(offset);
                             const translateZ = -Math.abs(offset) * 50;

                            return (
                                <div
                                    key={index}
                                    className="absolute w-full h-full p-6 bg-white rounded-2xl shadow-xl border border-gray-200 transition-all duration-300 ease-in-out flex flex-col items-center justify-center"
                                    style={{ 
                                        transform: `perspective(1000px) rotateY(${offset * -15}deg) translateX(${offset * 15}%) scale(${scale}) translateZ(${translateZ}px)`,
                                        opacity: Math.abs(offset) < 3 ? 1 : 0, // only show nearby cards
                                        zIndex: zIndex,
                                        pointerEvents: offset === 0 ? 'auto' : 'none'
                                    }}
                                >
                                     {offset === 0 && (
                                        <div className="flex flex-col items-center text-center transition-opacity duration-300" style={{opacity: opacity}}>
                                            <LightbulbIcon />
                                            <h2 className="text-xl font-semibold mt-4">{suggestion.title}</h2>
                                            <p className="text-gray-500 mt-2 flex-grow">{suggestion.description}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <button onClick={handleNext} className="absolute right-0 z-10 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors">
                            <RightArrowIcon />
                        </button>
                    </>
                ) : (
                    <div className="flex items-center space-x-2 text-gray-500">
                         <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse [animation-delay:0.4s]"></div>
                        <span>Generating ideas...</span>
                    </div>
                )}
            </div>

            <div className="mt-8">
                 {currentSuggestion && (
                    <button 
                        onClick={() => onAddToChat(currentSuggestion.prompt)}
                        className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-black transition-colors"
                    >
                        Add to chat
                    </button>
                 )}
            </div>
        </div>
    );
};

export default GeneratingPreview;
