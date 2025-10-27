import React from 'react';

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-4 text-white">
       <div className="absolute top-6 left-6">
         <button onClick={onBack} className="px-4 py-2 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md">
           &larr; Back
         </button>
       </div>
       <div className="w-full max-w-md bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
         <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
         <p className="text-white/60 mb-6">API key is managed via environment variables and cannot be configured here.</p>
       </div>
    </div>
  );
};

export default SettingsPage;
