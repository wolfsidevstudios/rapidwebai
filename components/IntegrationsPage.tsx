import React, { useState, useEffect } from 'react';
import Header from './Header';
import type { UserProfile } from '../App';


// --- Icon Components ---

const ChatGptIcon = () => (
    <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
        <path stroke="#00A67E" strokeWidth="8" d="M55.083 68.0001V47.8295C55.083 45.2386 56.5141 42.8596 58.803 41.6455L75.8077 32.6263C76.4756 32.2721 77.1852 32.0028 77.9199 31.8247V31.8247C91.132 28.6231 103.247 40.1201 100.741 53.4815L99.4308 60.464"></path><path stroke="#00A67E" strokeWidth="8" d="M55.6898 58.6917L73.2238 48.5685C75.4672 47.2732 78.2426 47.3228 80.4383 48.6975L96.9222 59.0174C97.4899 59.3728 98.0161 59.7905 98.4911 60.2628V60.2628C108.373 70.088 104.329 86.8903 91.0588 91.1435L85.4823 92.9308"></path><path stroke="#00A67E" strokeWidth="8" d="M65.0278 54.6897L82.5617 64.8129C84.8051 66.1081 86.1498 68.5365 86.0572 71.1253L85.3684 90.3777C85.3401 91.1679 85.2101 91.9512 84.9815 92.7082V92.7082C81.0209 105.824 64.9077 110.571 54.4688 101.698L49.9091 97.8221"></path><path stroke="#00A67E" strokeWidth="8" d="M73.083 60.0001L73.083 81.1103C73.083 83.7077 71.6449 86.0915 69.3472 87.3027L52.1565 96.3647C51.496 96.7128 50.7952 96.9786 50.0699 97.156V97.156C36.8679 100.384 24.6918 89.0047 27.0214 75.6149L28.3462 68.0001"></path><path stroke="#00A67E" strokeWidth="8" d="M72.4017 70.1317L53.9515 80.3036C51.6604 81.5668 48.8561 81.4468 46.6812 79.9927L29.9329 68.7948C29.5218 68.52 29.1356 68.2097 28.7787 67.8676V67.8676C19.5463 59.0181 22.6016 43.5788 34.5086 38.9126L41.9051 36.014"></path><path stroke="#00A67E" strokeWidth="8" d="M62.9532 74.1335L44.4512 63.1363C42.2518 61.8289 40.9408 59.4257 41.0323 56.8687L41.7107 37.9075C41.7472 36.8867 41.9514 35.8789 42.3152 34.9244V34.9244C47.2007 22.1063 63.5467 18.3712 73.5146 27.7954L77.0337 31.1225"></path>
    </svg>
);
const GoogleAnalyticsIcon = () => (
    <svg viewBox="0 0 94 104" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><path fill="#f9ab00" d="M93.947 90.985a12.925 12.925 0 0 1-12.857 12.993 12.362 12.362 0 0 1-1.591-.09 13.255 13.255 0 0 1-11.312-13.434V13.523A13.26 13.26 0 0 1 79.52.089a12.909 12.909 0 0 1 14.426 12.9Z"></path><path fill="#e37400" d="M12.882 78.236A12.882 12.882 0 1 1 0 91.118a12.882 12.882 0 0 1 12.882-12.882Zm33.893-39.044a13.256 13.256 0 0 0-12.527 13.545v34.6c0 9.391 4.133 15.09 10.187 16.3a12.9 12.9 0 0 0 15.209-10.084 12.61 12.61 0 0 0 .257-2.6v-38.81A12.925 12.925 0 0 0 47 39.192h-.225Z"></path></svg>
);
const PexelsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6">
        <g fill="#05A081">
            <path d="M12 23h5a1 1 0 0 0 1-1v-3a5 5 0 0 0 0-10h-6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm1-12h5a3 3 0 0 1 0 6h-1a1 1 0 0 0-1 1v3h-3Z"></path>
            <path d="M23.2 3h-9.6a1 1 0 0 0 0 2h9.6A3.8 3.8 0 0 1 27 8.8v14.4a3.8 3.8 0 0 1-3.8 3.8H8.8A3.8 3.8 0 0 1 5 23.2V8.8A3.8 3.8 0 0 1 8.8 5a1 1 0 0 0 0-2A5.8 5.8 0 0 0 3 8.8v14.4A5.8 5.8 0 0 0 8.8 29h14.4a5.8 5.8 0 0 0 5.8-5.8V8.8A5.8 5.8 0 0 0 23.2 3Z"></path>
        </g>
    </svg>
);


const ChevronUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
const EyeOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeClosedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .527-1.666 1.558-3.16 2.842-4.325m3.7-1.125A10.019 10.019 0 0112 5c4.478 0 8.268 2.943 9.542 7-.264.838-.624 1.626-1.07 2.375m-5.455-1.925a3 3 0 11-4.242-4.242 3 3 0 014.242 4.242zM3 3l18 18" /></svg>;

// --- Data ---

const integrations = [
    { id: 'chatgpt', name: 'ChatGPT', description: 'A powerful language model for generating human-like text and engaging in conversations', icon: <ChatGptIcon /> },
    { id: 'google-analytics', name: 'Google Analytics', description: 'Web analytics service that tracks and reports website traffic and user behavior', icon: <GoogleAnalyticsIcon /> },
    { id: 'pexels', name: 'Pexels', description: 'Access a vast library of high-quality, free stock photos and videos', icon: <PexelsIcon /> },
];

interface IntegrationsPageProps {
  onNavigate: (path: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
}

const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ onNavigate, user, onLogout }) => {
  const [openIntegration, setOpenIntegration] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({});
  const [keyVisibility, setKeyVisibility] = useState<{ [key: string]: boolean }>({});
  const [saveStatus, setSaveStatus] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const loadedKeys: { [key: string]: string } = {};
    integrations.forEach(int => {
        const key = localStorage.getItem(`integration_key_${int.id}`);
        if (key) {
            loadedKeys[int.id] = key;
        }
        setSaveStatus(prev => ({...prev, [int.id]: 'Save'}));
    });
    setApiKeys(loadedKeys);
  }, []);

  const handleSave = (id: string) => {
    const key = apiKeys[id] || '';
    setSaveStatus(prev => ({...prev, [id]: 'Saving...'}));
    
    if (key.trim()) {
        localStorage.setItem(`integration_key_${id}`, key);
    } else {
        localStorage.removeItem(`integration_key_${id}`);
    }

    setTimeout(() => {
        setSaveStatus(prev => ({...prev, [id]: 'Saved!'}));
        setTimeout(() => {
            setSaveStatus(prev => ({...prev, [id]: 'Save'}));
        }, 1500);
    }, 500);
  };

  const handleToggle = (id: string) => setOpenIntegration(prev => (prev === id ? null : id));
  const handleKeyChange = (id: string, value: string) => setApiKeys(prev => ({ ...prev, [id]: value }));
  const toggleVisibility = (id: string) => setKeyVisibility(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 pt-24 font-sans">
      <Header onNavigate={onNavigate} user={user} onLogout={onLogout} />
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Integrations</h1>
        <div className="space-y-3">
          {integrations.map(int => (
            <div key={int.id} className="bg-white border border-gray-200/80 rounded-2xl shadow-sm transition-all duration-300">
              <button onClick={() => handleToggle(int.id)} className="w-full flex items-center justify-between p-5 text-left">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    {int.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{int.name}</p>
                    <p className="text-sm text-gray-500">{int.description}</p>
                  </div>
                </div>
                <div className="text-gray-400">
                  {openIntegration === int.id ? <ChevronUpIcon /> : <ChevronRightIcon />}
                </div>
              </button>
              {openIntegration === int.id && (
                <div className="bg-gray-50/70 p-6 border-t border-gray-200/80">
                  <p className="font-semibold text-gray-700 mb-2">{int.name} API Key</p>
                  <div className="relative">
                    <input
                      type={keyVisibility[int.id] ? 'text' : 'password'}
                      value={apiKeys[int.id] || ''}
                      onChange={(e) => handleKeyChange(int.id, e.target.value)}
                      placeholder={`Enter your ${int.name} API key`}
                      className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button onClick={() => toggleVisibility(int.id)} className="absolute inset-y-0 right-0 px-3 flex items-center">
                      {keyVisibility[int.id] ? <EyeOpenIcon /> : <EyeClosedIcon />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button 
                        onClick={() => handleSave(int.id)} 
                        disabled={saveStatus[int.id] !== 'Save'}
                        className="px-4 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {saveStatus[int.id] || 'Save'}
                    </button>
                    <a href="#" className="text-sm text-blue-600 hover:underline">
                      How to get {int.name} API Key?
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
