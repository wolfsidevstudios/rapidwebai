import React, { useState } from 'react';

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

const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onStart(prompt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div 
        className="h-screen w-screen bg-cover bg-center" 
        style={{ backgroundImage: "url('https://i.ibb.co/tTjwPg3Y/Google-AI-Studio-2025-10-27-T21-45-49-645-Z.png')" }}
    >
      <div className="flex flex-col items-center justify-center h-full w-full bg-black/10">
        <div className="text-center mb-12">
            <h1 className="text-6xl font-extrabold text-white" style={{textShadow: '0 4px 15px rgba(0,0,0,0.5)'}}>
                Build with AI
            </h1>
            <p className="text-xl text-white/90 mt-4" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>
                Describe what you want to create, and watch it come to life.
            </p>
        </div>
        <form onSubmit={handleSubmit} className="relative w-full max-w-2xl px-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 'A vibrant login form with a subtle gradient background'"
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