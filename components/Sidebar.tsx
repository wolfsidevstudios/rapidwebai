import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile } from '../App';

// --- Icon Components ---

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-600 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const ProjectsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-600 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

const IntegrationsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-600 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
);


interface SidebarProps {
    user: UserProfile | null;
    onNavigate: (path: string) => void;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onNavigate, onLogout }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLoginClick = () => {
        // @ts-ignore
        if (window.google?.accounts?.id) {
            // @ts-ignore
            google.accounts.id.prompt();
        }
    };

    const NavButton: React.FC<{ title: string, onClick: () => void, children: React.ReactNode}> = ({ title, onClick, children }) => (
        <button
            onClick={onClick}
            title={title}
            className="group w-14 h-14 flex items-center justify-center rounded-2xl hover:bg-gray-200/70 transition-colors"
        >
            {children}
        </button>
    );

    return (
        <aside className="fixed inset-y-0 left-0 m-4 flex flex-col items-center justify-between py-5 bg-white border border-gray-200/80 rounded-full shadow-lg z-50 w-[72px]">
            {/* Main Icons */}
            <div className="flex flex-col items-center space-y-2">
                <div 
                    onClick={() => onNavigate('/')} 
                    className="text-xl font-bold cursor-pointer text-center flex items-center justify-center w-12 h-12 bg-black text-white rounded-full mb-4"
                    title="Home"
                >
                   R
                </div>
                <NavButton title="New App" onClick={() => onNavigate('/')}>
                    <PlusIcon />
                </NavButton>
                <NavButton title="My Projects" onClick={() => onNavigate('/profile')}>
                    <ProjectsIcon />
                </NavButton>
                <NavButton title="Integrations" onClick={() => onNavigate('/integrations')}>
                    <IntegrationsIcon />
                </NavButton>
            </div>

            {/* User Profile */}
            <div className="flex flex-col items-center" ref={profileRef}>
                {user ? (
                    <div className="relative">
                        <button onClick={() => setIsProfileOpen(!isProfileOpen)}>
                            <img src={user.picture} alt={user.name} className="w-11 h-11 rounded-full border-2 border-transparent hover:border-blue-500 transition-colors" />
                        </button>
                        {isProfileOpen && (
                            <div className="absolute left-full bottom-0 ml-3 mb-0 w-48 bg-white border border-gray-200/80 rounded-lg shadow-lg py-2">
                                <button onClick={() => { onNavigate('/profile'); setIsProfileOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    Profile
                                </button>
                                <button onClick={() => { onLogout(); setIsProfileOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={handleLoginClick}
                        title="Login"
                        className="w-11 h-11 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </button>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
