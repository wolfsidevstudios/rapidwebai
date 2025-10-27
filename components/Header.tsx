import React from 'react';

interface HeaderProps {
  // FIX: Removed 'settings' from navigation options.
  onNavigate: (page: 'about' | 'integrations') => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 p-6 bg-transparent">
      <div className="container mx-auto flex justify-end items-center">
        <nav className="flex items-center space-x-8 bg-black/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
          <button onClick={() => onNavigate('about')} className="text-sm text-white/80 hover:text-white transition-colors" disabled>About</button>
          <button onClick={() => onNavigate('integrations')} className="text-sm text-white/80 hover:text-white transition-colors" disabled>Integrations</button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
