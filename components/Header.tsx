import React from 'react';
import type { UserProfile } from '../App';

interface HeaderProps {
  onNavigate: (path: string) => void;
  user?: UserProfile | null;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, user }) => {

  const handleLoginClick = () => {
    // @ts-ignore - 'google' is from the GSI script in index.html
    if (window.google?.accounts?.id) {
        // @ts-ignore
        google.accounts.id.prompt();
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-50 p-6 bg-transparent">
      <div className="container mx-auto flex justify-between items-center">
        <div 
          onClick={() => onNavigate('/')} 
          className="text-xl font-bold text-white cursor-pointer"
          style={{textShadow: '0 2px 8px rgba(0,0,0,0.5)'}}
        >
          RapidWeb AI
        </div>
        <div className="flex items-center space-x-4">
          <nav className="flex items-center space-x-8 bg-black/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
            <button onClick={() => onNavigate('/integrations')} className="text-sm text-white/80 hover:text-white transition-colors">Integrations</button>
          </nav>
          {user ? (
            <div onClick={() => onNavigate('/profile')} className="flex items-center space-x-3 bg-black/20 backdrop-blur-md pl-2 pr-4 py-2 rounded-full border border-white/10 cursor-pointer hover:bg-black/40 transition-colors">
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
              <span className="text-white text-sm font-medium">{user.name}</span>
            </div>
          ) : (
            <button 
              onClick={handleLoginClick} 
              className="text-sm font-medium text-white/90 hover:text-white transition-colors px-3 py-2"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;