import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile, Project } from '../App';

const EditIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
    </svg>
);

const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

interface HeaderProps {
    user: UserProfile | null;
    onNavigate: (path: string) => void;
    onLogout: () => void;
    project?: Project;
    onUpdateProject?: (updatedProject: Project) => void;
    onPublish?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onNavigate, onLogout, project, onUpdateProject, onPublish }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [projectName, setProjectName] = useState(project?.name || '');
    const profileRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setProjectName(project?.name || '');
    }, [project?.name]);
    
    useEffect(() => {
        if (isEditingName) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditingName]);

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

    const handleNameUpdate = () => {
        if (project && onUpdateProject && projectName.trim()) {
            onUpdateProject({ ...project, name: projectName.trim() });
        } else {
            setProjectName(project?.name || ''); // Revert if empty
        }
        setIsEditingName(false);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleNameUpdate();
        } else if (e.key === 'Escape') {
            setProjectName(project?.name || '');
            setIsEditingName(false);
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-lg border-b border-white/10 text-white">
            <div className="container mx-auto flex justify-between items-center p-4 h-16">
                {/* Left Side */}
                <div 
                    onClick={() => onNavigate('/')} 
                    className="text-xl font-bold cursor-pointer"
                >
                    RapidWeb AI
                </div>

                {/* Center (Project Name) */}
                <div className="absolute left-1/2 -translate-x-1/2">
                    {project && (
                        <div className="flex items-center group">
                            {isEditingName ? (
                                <div className="flex items-center space-x-2">
                                    <input 
                                        ref={inputRef}
                                        type="text"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        onKeyDown={handleInputKeyDown}
                                        onBlur={handleNameUpdate}
                                        className="bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button onClick={handleNameUpdate} className="p-1.5 bg-blue-600 rounded-md hover:bg-blue-500 transition-colors">
                                        <CheckIcon />
                                    </button>
                                </div>
                            ) : (
                                <div onClick={() => setIsEditingName(true)} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white/10 transition-colors">
                                    <h1 className="text-lg font-medium text-white/90">{projectName}</h1>
                                    <span className="opacity-0 group-hover:opacity-60 transition-opacity">
                                        <EditIcon />
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side */}
                <div className="flex items-center space-x-4">
                    <nav className="hidden md:flex items-center space-x-6">
                        <button onClick={() => onNavigate('/integrations')} className="text-sm text-white/80 hover:text-white transition-colors">Integrations</button>
                    </nav>
                    {project && onPublish && (
                         <button 
                            onClick={onPublish}
                            className="px-4 py-2 rounded-full text-sm font-semibold transition-colors bg-white text-black hover:bg-gray-200"
                          >
                            Publish
                          </button>
                    )}
                    {user ? (
                        <div className="relative" ref={profileRef}>
                            <button onClick={() => setIsProfileOpen(!isProfileOpen)}>
                                <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full border-2 border-transparent hover:border-blue-500 transition-colors" />
                            </button>
                            {isProfileOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-white/10 rounded-lg shadow-lg py-2">
                                    <button onClick={() => { onNavigate('/profile'); setIsProfileOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">
                                        Profile
                                    </button>
                                    <button onClick={() => { onLogout(); setIsProfileOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button 
                            onClick={handleLoginClick} 
                            className="text-sm font-medium text-white/90 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/10"
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
