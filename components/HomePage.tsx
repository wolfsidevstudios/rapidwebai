import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile } from '../App';

const UpArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5L12 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


interface HomePageProps {
  onStart: (prompt: string) => void;
}

const commands = [
  {
    command: 'todo',
    name: 'To-Do App',
    description: 'A classic to-do list with Firebase auth and persistence.',
    prompt: 'A real-time to-do list app with Google authentication and Firebase Firestore for storage, allowing users to add, edit, and delete tasks.',
  },
  {
    command: 'blog',
    name: 'Blog',
    description: 'A simple, clean blog with posts and comments.',
    prompt: 'A personal blog website with a homepage to list all posts, individual pages for each post, and a section for comments. Use a simple design.',
  },
  {
    command: 'portfolio',
    name: 'Portfolio',
    description: 'A modern developer portfolio to showcase your projects.',
    prompt: 'A developer portfolio website with a home section, an about section, a projects section with cards for each project, and a contact form.',
  },
  {
    command: 'weather',
    name: 'Weather App',
    description: 'A weather app that shows the forecast for a city.',
    prompt: 'A weather application that allows users to search for a city and see the current temperature, humidity, wind speed, and a 5-day forecast.',
  },
];


const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  const [prompt, setPrompt] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
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

  return (
    <div 
        className="relative h-full w-full bg-cover bg-center" 
        style={{ backgroundImage: "url('https://i.ibb.co/tTjwPg3Y/Google-AI-Studio-2025-10-27-T21-45-49-645-Z.png')" }}
    >
      <div className="flex flex-col items-center justify-center h-full w-full bg-black/10">
        <div className="text-center mb-12">
            <h1 className="text-6xl font-extrabold text-white" style={{textShadow: '0 4px 15px rgba(0,0,0,0.5)'}}>
                Build Full-Stack Apps with AI
            </h1>
            <p className="text-xl text-white/90 mt-4" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>
                Describe the web application you want to build, from a simple component to a full-stack solution.
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
          <textarea
            ref={textAreaRef}
            value={prompt}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 'A to-do list app' or type '/' for templates"
            className="w-full h-40 p-6 pr-20 text-xl bg-white text-gray-800 placeholder-gray-500 rounded-3xl shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/60 resize-none transition-all"
            aria-label="Initial prompt input"
          />
          <button
            type="submit"
            className="absolute bottom-4 right-6 w-12 h-12 bg-black rounded-full flex items-center justify-center transition-transform transform hover:scale-110 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!prompt.trim()}
            aria-label="Start building"
          >
            <UpArrowIcon />
          </button>
        </form>
      </div>
    </div>
  );
};

export default HomePage;