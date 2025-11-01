import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile } from '../App';
import ImageGenerationModal from './ImageGenerationModal';

const UpArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5L12 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const ImageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-500 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);


interface HomePageProps {
  onStart: (prompt: string, image?: string) => void;
}

const commands = [
  {
    command: 'todo',
    name: 'To-Do App',
    description: 'A simple to-do list for iOS and Android.',
    prompt: 'A simple to-do list app where users can add tasks to a list and mark them as complete by tapping on them.',
  },
  {
    command: 'weather',
    name: 'Weather App',
    description: 'Shows the weather for a given city.',
    prompt: 'A weather app that uses an input field to get a city name and displays the current temperature and weather conditions.',
  },
  {
    command: 'calculator',
    name: 'Tip Calculator',
    description: 'Calculates the tip and total for a bill.',
    prompt: 'A tip calculator that takes a bill amount and a tip percentage, then calculates and displays the tip amount and the total bill.',
  },
  {
    command: 'quote',
    name: 'Quote of the Day',
    description: 'Displays a new inspirational quote each day.',
    prompt: 'An app that fetches a random inspirational quote from an API and displays it on the screen with a button to get a new quote.',
  },
];


const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  const [prompt, setPrompt] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const filteredCommands = commandQuery
    ? commands.filter(c => c.command.toLowerCase().startsWith(commandQuery.toLowerCase()))
    : commands;
  
  useEffect(() => {
    setActiveIndex(0);
  }, [commandQuery]);
  
  const handleCommandSelect = (command: typeof commands[0]) => {
    setPrompt(command.prompt);
    setShowCommands(false);
    setTimeout(() => textAreaRef.current?.focus(), 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);
    
    const commandMatch = value.match(/\/([a-zA-Z0-9]*)$/);
    if (commandMatch) {
      setShowCommands(true);
      setCommandQuery(commandMatch[1]);
    } else {
      setShowCommands(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommands && filteredCommands.length > 0) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % filteredCommands.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (!e.shiftKey) { // Allow Shift+Enter for newlines
                e.preventDefault();
                handleCommandSelect(filteredCommands[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowCommands(false);
        }
    } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onStart(prompt);
    }
  };

  const handleStartWithImage = (imagePrompt: string, imageData: string) => {
    onStart(imagePrompt, imageData);
  };

  return (
    <div 
        className="relative h-full w-full bg-cover bg-center" 
        style={{ backgroundImage: "url('https://i.ibb.co/tTjwPg3Y/Google-AI-Studio-2025-10-27-T21-45-49-645-Z.png')" }}
    >
      <ImageGenerationModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onAddToChat={handleStartWithImage}
      />
      <div className="flex flex-col items-center justify-center h-full w-full bg-black/10">
        <div className="text-center mb-12">
            <h1 className="text-6xl font-extrabold text-white" style={{textShadow: '0 4px 15px rgba(0,0,0,0.5)'}}>
                Build React Native Apps with AI
            </h1>
            <p className="text-xl text-white/90 mt-4" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>
                Describe the mobile application you want to build for iOS and Android.
            </p>
        </div>
        <form onSubmit={handleSubmit} className="relative w-full max-w-2xl px-4">
            {showCommands && (
                <div className="absolute bottom-full mb-2 w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-2 border border-gray-200/50 z-10">
                    <p className="px-2 pb-1 text-xs text-gray-600 font-semibold">
                        {commandQuery ? 'Matching Templates' : 'Popular Templates'}
                    </p>
                    <div className="max-h-64 overflow-y-auto">
                        {filteredCommands.length > 0 ? filteredCommands.map((cmd, index) => (
                        <button
                            key={cmd.command}
                            type="button"
                            onClick={() => handleCommandSelect(cmd)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                            index === activeIndex ? 'bg-blue-500/20' : 'hover:bg-black/5'
                            }`}
                        >
                            <p className="font-bold text-gray-800">{cmd.name}</p>
                            <p className="text-sm text-gray-600">{cmd.description}</p>
                        </button>
                        )) : (
                        <p className="p-3 text-sm text-gray-500">No templates found.</p>
                        )}
                    </div>
                </div>
            )}
            <div className="relative">
              <textarea
                ref={textAreaRef}
                value={prompt}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="e.g., 'A simple counter app' or type '/' for templates"
                className="w-full h-40 p-6 pl-20 pr-20 text-xl bg-white text-gray-800 placeholder-gray-500 rounded-3xl shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/60 resize-none transition-all"
                aria-label="Initial prompt input"
              />
              <button
                type="button"
                onClick={() => setIsImageModalOpen(true)}
                className="group absolute bottom-4 left-6 w-12 h-12 bg-gray-200/50 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                aria-label="Generate with image"
                title="Generate with image or icon"
              >
                  <ImageIcon />
              </button>
              <button
                type="submit"
                className="absolute bottom-4 right-6 w-12 h-12 bg-black rounded-full flex items-center justify-center transition-transform transform hover:scale-110 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!prompt.trim()}
                aria-label="Start building"
              >
                <UpArrowIcon />
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default HomePage;