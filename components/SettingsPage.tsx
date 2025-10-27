import React, { useState, useEffect } from 'react';

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const [apiKey, setApiKey] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key') || '';
    setApiKey(storedKey);
  }, []);

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setSaveMessage('API Key saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000); // Hide message after 3s
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-4 text-white">
       <div className="absolute top-6 left-6">
         <button onClick={onBack} className="px-4 py-2 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md">
           &larr; Back
         </button>
       </div>
       <div className="w-full max-w-md bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
         <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
         <p className="text-white/60 mb-6">Manage your application settings here.</p>
         
         <div className="space-y-4">
           <div>
             <label htmlFor="api-key" className="block text-sm font-medium text-white/80 mb-2">
               Gemini API Key
             </label>
             <input
               type="password"
               id="api-key"
               value={apiKey}
               onChange={(e) => setApiKey(e.target.value)}
               placeholder="Enter your Gemini API key"
               className="w-full p-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
             <p className="text-xs text-white/50 mt-2">
                Your key is stored only in your browser's local storage.
             </p>
           </div>
           
           <div className="flex items-center justify-between">
                {saveMessage ? (
                    <span className="text-green-400 text-sm">{saveMessage}</span>
                ) : (
                    <span></span> 
                )}
                <button 
                    onClick={handleSave}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
                >
                    Save
                </button>
           </div>
         </div>
       </div>
    </div>
  );
};

export default SettingsPage;
