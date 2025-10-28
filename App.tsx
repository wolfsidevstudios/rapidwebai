// FIX: Declare the global 'google' object provided by the Google Identity Services script to prevent TypeScript errors.
declare const google: any;

import React, { useState, useEffect, useCallback } from 'react';
import HomePage from './components/HomePage';
import { GoogleGenAI } from "@google/genai";
import OnboardingModal from './components/OnboardingModal';
import IntegrationsPage from './components/IntegrationsPage';
import ProjectPage from './components/ProjectPage';
import ProfilePage from './components/ProfilePage';
import PreviewPage from './components/PreviewPage';
import Sidebar from './components/Sidebar';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  chatHistory: ChatMessage[];
  createdAt: number;
}


const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [location, setLocation] = useState(window.location.pathname);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // --- Routing ---
  useEffect(() => {
    const handlePopState = () => setLocation(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setLocation(path);
  };

  // --- Auth & Data Persistence ---
  useEffect(() => {
    const storedUser = localStorage.getItem('google_user_profile');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      const userProjects = localStorage.getItem(`projects_${parsedUser.email}`);
      setProjects(userProjects ? JSON.parse(userProjects) : []);
    }

    if (localStorage.getItem('hasCompletedOnboarding') !== 'true') {
      setShowOnboarding(true);
    }
  }, []);

  const handleLoginSuccess = useCallback((credentialResponse: any) => {
    const credential = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
    const profile: UserProfile = {
      name: credential.name,
      email: credential.email,
      picture: credential.picture,
    };
    setUser(profile);
    localStorage.setItem('google_user_profile', JSON.stringify(profile));
    const userProjects = localStorage.getItem(`projects_${profile.email}`);
    setProjects(userProjects ? JSON.parse(userProjects) : []);
  }, []);
  
  const handleLogout = () => {
    setUser(null);
    setProjects([]);
    localStorage.removeItem('google_user_profile');
    google.accounts.id.disableAutoSelect();
    navigate('/');
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (google?.accounts?.id) {
        clearInterval(intervalId);
        google.accounts.id.initialize({
          client_id: '127898517822-s1n15vk32sac7a28na4tdp68j21kjula.apps.googleusercontent.com',
          callback: handleLoginSuccess,
        });
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [handleLoginSuccess]);
  
  useEffect(() => {
    if (user?.email) {
      localStorage.setItem(`projects_${user.email}`, JSON.stringify(projects));
    }
  }, [projects, user]);

  // --- Onboarding ---
  const handleOnboardingComplete = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    setShowOnboarding(false);
  };

  // --- Project Management ---
  const handleCreateNewProject = (prompt: string) => {
    if (!user) {
        alert("Please log in to create a project.");
        // @ts-ignore
        if(window.google) {
           // @ts-ignore
           google.accounts.id.prompt();
        }
        return;
    }
    const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: prompt.substring(0, 50) || 'New Project',
        code: `import React from 'react';\n\nconst App = () => {\n  return (\n    <div className="flex items-center justify-center h-full bg-gray-100 p-4">\n      <p className="text-gray-500">Generating your component...</p>\n    </div>\n  );\n};\n\nexport default App;`,
        chatHistory: [],
        createdAt: Date.now(),
    };
    setProjects(prev => [...prev, newProject]);
    navigate(`/app/${newProject.id}`);
    
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('startProjectWithMessage', { detail: { projectId: newProject.id, message: prompt } }));
    }, 100);
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
  }

  // --- Render Logic ---
  const renderPage = () => {
    if (location === '/') {
      return <HomePage onStart={handleCreateNewProject} />;
    }
    if (location === '/integrations') {
      return <IntegrationsPage />;
    }
    if (location === '/profile') {
        return <ProfilePage user={user} projects={projects} onOpenProject={(id) => navigate(`/app/${id}`)} />;
    }

    const previewMatch = location.match(/^\/app\/preview\/(proj-\d+)$/);
    if (previewMatch) {
      const projectId = previewMatch[1];
      const project = projects.find(p => p.id === projectId); 
      if (!project) {
        return <div className="h-screen w-screen flex items-center justify-center text-center text-white bg-black p-4">Project not found.<br/> (This is a simulated public link. In a real app, this would fetch from a database.) <a href="/" className='underline ml-2'>Go home</a></div>;
      }
      return <PreviewPage project={project} />;
    }

    const projectMatch = location.match(/^\/app\/(proj-\d+)$/);
    if (projectMatch) {
      const projectId = projectMatch[1];
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        return <div className="h-screen w-screen flex items-center justify-center text-white bg-black">Project not found. <a href="/" className='underline ml-2'>Go home</a></div>;
      }
      return <ProjectPage project={project} onUpdateProject={updateProject} />;
    }

    return <HomePage onStart={handleCreateNewProject} />;
  };

  const shouldShowSidebar = !location.startsWith('/app/preview/');

  return (
    <>
      {shouldShowSidebar && <Sidebar user={user} onNavigate={navigate} onLogout={handleLogout} />}
      {renderPage()}
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
    </>
  );
};

export default App;
