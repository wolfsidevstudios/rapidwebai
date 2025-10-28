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
  files: Record<string, string>;
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
    const defaultFiles = {
      'public/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="../src/main.jsx"></script>
  </body>
</html>`,
      'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      'src/App.jsx': `import React from 'react';

function App() {
  return (
    <div className="app">
      <h1>Generating your app...</h1>
      <p>The AI is creating the files for your new project. This might take a moment.</p>
    </div>
  );
}

export default App;`,
      'src/styles.css': `body {
  font-family: sans-serif;
  margin: 0;
  padding: 0;
  background-color: #ffffff;
}
.app {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    text-align: center;
}
`,
      'package.json': `{
  "name": "new-react-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`
    };
    const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: prompt.substring(0, 50) || 'New Project',
        files: defaultFiles,
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
      const allProjects = projects.length > 0 ? projects : JSON.parse(localStorage.getItem(`projects_${user?.email}`) || '[]');
      const project = allProjects.find((p: Project) => p.id === projectId); 
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

  // Preview pages should be fullscreen and not wrapped in the main layout
  if (!shouldShowSidebar) {
      return (
          <>
              {renderPage()}
              {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
          </>
      )
  }

  const isHomePage = location === '/';
  // Sidebar is 72px wide with a 16px margin (m-4). Right edge is at 88px. Add 16px gap = 104px.
  const mainContentLeftClass = isHomePage ? 'left-4' : 'left-[104px]';

  return (
    <>
      <Sidebar user={user} onNavigate={navigate} onLogout={handleLogout} />
      
      <main className={`
          absolute top-4 bottom-4 right-4 
          ${mainContentLeftClass}
          transition-all duration-300 ease-in-out
      `}>
          <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-black">
               {renderPage()}
          </div>
      </main>

      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
    </>
  );
};

export default App;