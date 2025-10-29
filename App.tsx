// FIX: Declare the global 'google' object provided by the Google Identity Services script to prevent TypeScript errors.
declare const google: any;

import React, { useState, useEffect, useCallback } from 'react';
import HomePage from './components/HomePage';
import OnboardingModal from './components/OnboardingModal';
import IntegrationsPage from './components/IntegrationsPage';
import ProjectPage from './components/ProjectPage';
import ProfilePage from './components/ProfilePage';
import PreviewPage from './components/PreviewPage';
import Sidebar from './components/Sidebar';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  image?: string; // base64 data URL
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export interface Project {
  id: string;
  name:string;
  files: { [key: string]: string };
  chatHistory: ChatMessage[];
  createdAt: number;
}


const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [location, setLocation] = useState(window.location.pathname);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [pendingNavigationProjectId, setPendingNavigationProjectId] = useState<string | null>(null);

  // --- Routing ---
  useEffect(() => {
    const handlePopState = () => setLocation(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setLocation(path);
  }, []);

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
  const handleCreateNewProject = useCallback((prompt: string, image?: string) => {
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
      'pages/index.tsx': `import React from 'react';

const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white font-sans">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800">Generating your app...</h1>
            <p className="mt-4 text-lg text-gray-600">The AI is creating your new project. This might take a moment.</p>
        </div>
    </div>
  );
};

export default HomePage;
`,
      'styles/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
      'package.json': JSON.stringify({
        name: 'new-nextjs-pwa-app',
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          react: '^18',
          'react-dom': '^18',
          next: '14.2.3',
          'next-pwa': '^5.6.0',
        },
        devDependencies: {
          typescript: '^5',
          '@types/node': '^20',
          '@types/react': '^18',
          '@types/react-dom': '^18',
          postcss: '^8',
          tailwindcss: '^3.4.1',
          eslint: '^8',
          'eslint-config-next': '14.2.3',
        },
      }, null, 2),
      'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`,
      'next.config.js': `/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

const nextConfig = {};

module.exports = withPWA(nextConfig);
`,
      'public/manifest.json': JSON.stringify({
        name: "AI Generated PWA",
        short_name: "AIPWA",
        description: "An application generated by AI with offline capabilities.",
        icons: [
            {
                "src": "/icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            },
            {
                "src": "/icons/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            }
        ],
        theme_color: "#000000",
        background_color: "#000000",
        start_url: "/",
        display: "standalone"
      }, null, 2),
      'pages/_document.tsx': `import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="application-name" content="AI PWA" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AI PWA" />
        <meta name="description" content="An application generated by AI" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}`,
      'pages/_app.tsx': `import '../styles/globals.css';
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;`,
      'public/icons/icon-192x192.png': '',
      'public/icons/icon-512x512.png': '',
    };

    const initialChatHistory: ChatMessage[] = [];
    if (prompt || image) {
        initialChatHistory.push({
            role: 'user',
            content: prompt,
            image: image,
        });
    }

    const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: prompt.substring(0, 50) || 'New Visual Project',
        files: defaultFiles,
        chatHistory: initialChatHistory,
        createdAt: Date.now(),
    };
    setProjects(prev => [...prev, newProject]);
    setPendingNavigationProjectId(newProject.id);
    
    if (initialChatHistory.length > 0) {
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('startProjectWithMessage', { detail: { projectId: newProject.id } }));
        }, 100);
    }
  }, [user]);

  useEffect(() => {
    if (pendingNavigationProjectId && projects.find(p => p.id === pendingNavigationProjectId)) {
      navigate(`/app/${pendingNavigationProjectId}`);
      setPendingNavigationProjectId(null);
    }
  }, [pendingNavigationProjectId, projects, navigate]);

  const updateProject = useCallback((updatedProject: Project) => {
    setProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
  }, []);

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