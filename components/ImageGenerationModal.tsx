import React, { useState } from 'react';
import { GoogleGenAI, Modality, Type } from "@google/genai";

// --- Icon Components ---
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
);
const AddToChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse"></div>
        <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse [animation-delay:0.2s]"></div>
        <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse [animation-delay:0.4s]"></div>
    </div>
);


interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToChat: (prompt: string, imageData: string) => void;
}

const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({ isOpen, onClose, onAddToChat }) => {
    const [mode, setMode] = useState<'image' | 'icon'>('image');
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim() || isLoading) return;
        setIsLoading(true);
        setError(null);
        setResults([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            if (mode === 'image') {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
                const base64ImageBytes = response.candidates[0].content.parts[0].inlineData.data;
                const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
                setResults([imageUrl]);
            } else { // mode === 'icon'
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Generate 4 simple, modern, single-color SVG icons for: "${prompt}". The icons should be visually consistent. Return a JSON object with a single key "icons" which is an array of 4 strings. Each string must be a complete, valid SVG code with no extra formatting. The SVG should not have a fixed width or height to be scalable. Ensure the response is only the JSON object.`,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                icons: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING }
                                }
                            },
                            required: ["icons"]
                        }
                    }
                });
                const parsed = JSON.parse(response.text);
                const svgStrings = parsed.icons.map((svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`);
                setResults(svgStrings);
            }
        } catch (e) {
            console.error("Generation failed:", e);
            setError("Sorry, something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleGenerate();
        }
    };

    const handleAddToChat = (imageData: string) => {
        onAddToChat(prompt, imageData);
        onClose();
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col animate-fade-in" aria-modal="true" role="dialog">
            <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }`}</style>
            
            {/* --- Header --- */}
            <div className="flex justify-between items-center p-4 shrink-0">
                 <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-full border border-gray-200/80">
                    <button onClick={() => setMode('image')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${mode === 'image' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}>Image</button>
                    <button onClick={() => setMode('icon')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${mode === 'icon' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}>Icon</button>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><CloseIcon /></button>
            </div>

            {/* --- Content / Preview --- */}
            <div className="flex-grow flex items-center justify-center p-8 overflow-y-auto">
                <div className="w-full h-full flex items-center justify-center">
                    {isLoading ? ( <LoadingSpinner />) : 
                     error ? (<p className="text-red-500">{error}</p>) :
                     results.length === 0 ? (
                        <p className="text-gray-500 text-lg">Enter a prompt below to generate an {mode}.</p>
                    ) : (
                        mode === 'image' ? (
                            <div className="relative group">
                                <img src={results[0]} alt={prompt} className="max-h-[70vh] max-w-[80vw] object-contain rounded-lg shadow-xl"/>
                                <button onClick={() => handleAddToChat(results[0])} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                    <div className="flex items-center px-4 py-2 bg-white/90 text-black font-semibold rounded-full backdrop-blur-sm">
                                        <AddToChatIcon /> Add to chat
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-6">
                                {results.map((icon, index) => (
                                    <div key={index} className="relative group p-4 border border-gray-200 rounded-xl flex items-center justify-center w-48 h-48 bg-gray-50/50">
                                        <img src={icon} alt={`icon ${index+1}`} className="w-24 h-24 object-contain"/>
                                        <button onClick={() => handleAddToChat(icon)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                            <div className="flex items-center px-3 py-1.5 bg-white/90 text-black text-sm font-semibold rounded-full backdrop-blur-sm">
                                               <AddToChatIcon /> Add
                                            </div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* --- Footer / Input --- */}
            <div className="p-6 shrink-0">
                <div className="relative">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={mode === 'image' ? "e.g., A cute robot holding a red skateboard" : "e.g., A minimalist icon for a weather app"}
                        className="w-full pl-6 pr-16 py-4 text-lg bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200/80"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center transition-transform transform hover:scale-105 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Generate"
                    >
                        <SendIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageGenerationModal;
