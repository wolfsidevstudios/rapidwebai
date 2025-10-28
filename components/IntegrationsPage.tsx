import React, { useState, useEffect } from 'react';
import { integrations, firebaseConfigFields, Integration } from './integrations';

// --- Icon Components ---
const ChevronUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
const EyeOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeClosedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .527-1.666 1.558-3.16 2.842-4.325m3.7-1.125A10.019 10.019 0 0112 5c4.478 0 8.268 2.943 9.542 7-.264.838-.624 1.626-1.07 2.375m-5.455-1.925a3 3 0 11-4.242-4.242 3 3 0 014.242 4.242zM3 3l18 18" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


interface IntegrationsPageProps {}

const IntegrationsPage: React.FC<IntegrationsPageProps> = () => {
  const [openIntegration, setOpenIntegration] = useState<string | null>('firebase');
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({});
  const [firebaseConfig, setFirebaseConfig] = useState<{ [key: string]: string }>({});
  const [keyVisibility, setKeyVisibility] = useState<{ [key: string]: boolean }>({});
  const [saveStatus, setSaveStatus] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const loadedKeys: { [key: string]: string } = {};
    const firebaseConf = localStorage.getItem('integration_key_firebase');
    if (firebaseConf) {
        try {
            setFirebaseConfig(JSON.parse(firebaseConf));
        } catch(e) { console.error("Failed to parse Firebase config", e); }
    }

    integrations.forEach(int => {
        if (int.type === 'private') {
            const key = localStorage.getItem(`integration_key_${int.id}`);
            if (key) {
                loadedKeys[int.id] = key;
            }
        }
        setSaveStatus(prev => ({...prev, [int.id]: 'Save'}));
    });
    setApiKeys(loadedKeys);
  }, []);

  const handleSave = (id: string) => {
    setSaveStatus(prev => ({...prev, [id]: 'Saving...'}));
    
    if (id === 'firebase') {
        localStorage.setItem('integration_key_firebase', JSON.stringify(firebaseConfig));
    } else {
        const key = apiKeys[id] || '';
        if (key.trim()) {
            localStorage.setItem(`integration_key_${id}`, key);
        } else {
            localStorage.removeItem(`integration_key_${id}`);
        }
    }

    setTimeout(() => {
        setSaveStatus(prev => ({...prev, [id]: 'Saved!'}));
        setTimeout(() => {
            setSaveStatus(prev => ({...prev, [id]: 'Save'}));
        }, 1500);
    }, 500);
  };
  
  const handleFirebaseConfigChange = (field: string, value: string) => {
    setFirebaseConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleToggle = (id: string) => setOpenIntegration(prev => (prev === id ? null : id));
  const handleKeyChange = (id: string, value: string) => setApiKeys(prev => ({ ...prev, [id]: value }));
  const toggleVisibility = (id: string) => setKeyVisibility(prev => ({ ...prev, [id]: !prev[id] }));

  const renderContent = (int: Integration) => {
    switch(int.type) {
        case 'config':
            return (
                <>
                    <p className="font-semibold text-gray-300 mb-3">Firebase Web App Config</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {firebaseConfigFields.map(field => (
                            <div key={field}>
                                <label className="text-sm font-medium text-gray-400 mb-1 block">{field}</label>
                                <input
                                    type="text"
                                    value={firebaseConfig[field] || ''}
                                    onChange={(e) => handleFirebaseConfigChange(field, e.target.value)}
                                    placeholder={`Enter your ${field}`}
                                    className="w-full p-2 bg-gray-800 border border-white/20 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-6">
                        <button
                            onClick={() => handleSave(int.id)}
                            disabled={saveStatus[int.id] !== 'Save'}
                            className="px-4 py-2 bg-gray-200 text-black text-sm font-semibold rounded-lg hover:bg-white transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {saveStatus[int.id] || 'Save'}
                        </button>
                        <a href="https://firebase.google.com/docs/web/setup#add-sdks-initialize" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">
                            How to get Firebase config?
                        </a>
                    </div>
                </>
            );
        case 'private':
            return (
                <>
                <p className="font-semibold text-gray-300 mb-2">{int.name} API Key</p>
                <div className="relative">
                    <input
                    type={keyVisibility[int.id] ? 'text' : 'password'}
                    value={apiKeys[int.id] || ''}
                    onChange={(e) => handleKeyChange(int.id, e.target.value)}
                    placeholder={`Enter your ${int.name} API key`}
                    className="w-full p-2 pr-10 bg-gray-800 border border-white/20 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                    />
                    <button onClick={() => toggleVisibility(int.id)} className="absolute inset-y-0 right-0 px-3 flex items-center">
                    {keyVisibility[int.id] ? <EyeOpenIcon /> : <EyeClosedIcon />}
                    </button>
                </div>
                <div className="flex items-center justify-between mt-4">
                    <button 
                        onClick={() => handleSave(int.id)} 
                        disabled={saveStatus[int.id] !== 'Save'}
                        className="px-4 py-2 bg-gray-200 text-black text-sm font-semibold rounded-lg hover:bg-white transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                    {saveStatus[int.id] || 'Save'}
                    </button>
                    <a href="#" className="text-sm text-blue-400 hover:underline">
                    How to get {int.name} API Key?
                    </a>
                </div>
                </>
            );
        case 'public':
            return (
                <div className="flex items-center space-x-3">
                    <CheckCircleIcon />
                    <p className="text-gray-300">This is a public API and is ready to use.</p>
                </div>
            )
        default:
            return null;
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-8 pt-8 font-sans text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-100 mb-8">Integrations</h1>
        <div className="space-y-3">
          {integrations.map(int => (
            <div key={int.id} className="bg-gray-900 border border-white/10 rounded-2xl shadow-sm transition-all duration-300">
              <button onClick={() => handleToggle(int.id)} className="w-full flex items-center justify-between p-5 text-left">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mr-4">
                    {int.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-200">{int.name}</p>
                    <p className="text-sm text-gray-400">{int.description}</p>
                  </div>
                </div>
                <div className="text-gray-500">
                  {openIntegration === int.id ? <ChevronUpIcon /> : <ChevronRightIcon />}
                </div>
              </button>
              {openIntegration === int.id && (
                <div className="bg-black/50 p-6 border-t border-white/10">
                    {renderContent(int)}
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
