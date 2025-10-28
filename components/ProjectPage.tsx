import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import ChatPanel from './ChatPanel';
import EditorPreviewPanel from './EditorPreviewPanel';
import useDebounce from '../hooks/useDebounce';
import type { Project, UserProfile } from '../App';
import { GoogleGenAI } from "@google/genai";
import PublishModal from './PublishModal';

interface ProjectPageProps {
    project: Project;
    onUpdateProject: (updatedProject: Project) => void;
    onNavigate: (path: string) => void;
    user: UserProfile | null;
    onLogout: () => void;
}

const ProjectPage: React.FC<ProjectPageProps> = ({ project, onUpdateProject, onNavigate, user, onLogout }) => {
    const [code, setCode] = useState(project.code);
    const [chatHistory, setChatHistory] = useState(project.chatHistory);
    const [transpiledCode, setTranspiledCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const debouncedCode = useDebounce(code, 500);
    const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
    const [isLoading, setIsLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const transpileCode = useCallback((codeToTranspile: string) => {
        try {
        // @ts-ignore - Babel is loaded from a script tag
        const result = Babel.transform(codeToTranspile, {
            presets: ['env', 'react', 'typescript'],
            filename: 'Component.tsx',
        });
        setTranspiledCode(result.code);
        setError(null);
        } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown transpilation error occurred.');
        }
        setTranspiledCode(null);
        }
    }, []);
    
    useEffect(() => {
        transpileCode(debouncedCode);
    }, [debouncedCode, transpileCode]);
    
    // Auto-save whenever code or chat history changes
    useEffect(() => {
        onUpdateProject({ ...project, code, chatHistory });
    }, [code, chatHistory]);

    // Listen for the custom event from App.tsx to start the first message
    useEffect(() => {
        const handleInitialMessage = (event: CustomEvent) => {
            const { projectId, message } = event.detail;
            if (project.id === projectId && chatHistory.length === 0) {
                handleSendMessage(message);
            }
        };

        // @ts-ignore
        window.addEventListener('startProjectWithMessage', handleInitialMessage);
        return () => {
            // @ts-ignore
            window.removeEventListener('startProjectWithMessage', handleInitialMessage);
        };
    }, [project.id]);


    const handleSendMessage = async (message: string) => {
        if (!message.trim()) return;
        setIsLoading(true);
        const newHistory = [...chatHistory, { role: 'user', content: message }];
        setChatHistory(newHistory);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const availableIntegrations = ['chatgpt', 'google-analytics', 'pexels'];
            const savedKeys: { [key: string]: string } = {};
            availableIntegrations.forEach(id => {
                const key = localStorage.getItem(`integration_key_${id}`);
                if (key) {
                savedKeys[id.toUpperCase()] = key;
                }
            });

            let integrationsContext = '';
            if (Object.keys(savedKeys).length > 0) {
                integrationsContext = `The user has provided API keys for the following services. When the user's request involves one of these services, you MUST use the provided API key directly in the generated code. Do not use placeholder keys for these services.\n\n`;
                for (const [service, key] of Object.entries(savedKeys)) {
                    integrationsContext += `- Service: ${service}\n  API Key: ${key}\n`;
                }
                integrationsContext += '\n---\n';
            }

            const authContext = `
---
MANDATORY: User Authentication (Google Sign-In)
You MUST always add Google Sign-in functionality to every component you generate, regardless of the user's prompt. Follow the exact implementation pattern provided below. Integrate the login UI logically and visibly within the component you are creating. For example, add a login button or show a user profile section.

1.  **Client ID**: Use this exact client ID: '127898517822-s1n15vk32sac7a28na4tdp68j21kjula.apps.googleusercontent.com'.
2.  **Global Object**: The GSI library is available on the global \`window.google\` object. To use it in TypeScript without errors, add this declaration at the very top of the component file: \`declare const google: any;\`
3.  **Implementation**: Use a \`useEffect\` hook to initialize the client and render the button. Manage the user's profile information using \`useState\`.

**Example Implementation Pattern:**

\`\`\`jsx
// Add this declaration at the top of the file
declare const google: any;

import React, { useState, useEffect } from 'react';

const YourComponent = () => {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (response) => {
    // The credential is a JWT. We decode the payload part.
    const userProfile = JSON.parse(atob(response.credential.split('.')[1]));
    setUser({
      name: userProfile.name,
      email: userProfile.email,
      picture: userProfile.picture,
    });
  };
  
  const handleLogout = () => {
    setUser(null);
    // You might also need to call google.accounts.id.disableAutoSelect();
  }

  useEffect(() => {
    if (window.google) {
      google.accounts.id.initialize({
        client_id: '127898517822-s1n15vk32sac7a28na4tdp68j21kjula.apps.googleusercontent.com',
        callback: handleLoginSuccess,
      });

      google.accounts.id.renderButton(
        document.getElementById("signInDiv"), // Ensure an element with this ID exists in your JSX
        { theme: "outline", size: "large", shape: 'pill' }
      );
    }
  }, []);

  return (
    <div>
      {user ? (
        <div>
          <img src={user.picture} alt={user.name} />
          <h3>{user.name}</h3>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div id="signInDiv"></div>
      )}
    </div>
  );
};

export default YourComponent;
\`\`\`
---
`;

            const fullPrompt = `You are an expert React developer specializing in modifying existing React components.
You will be given the current code for a single functional component and a user request for changes.
Your task is to apply the requested changes to the code and return the complete, updated code for the component.
Preserve the existing logic and structure as much as possible, only making the necessary modifications.
Return only the raw code for the component. Do not add any explanations, introductions, or markdown formatting like \`\`\`jsx.
The component must remain a default export and include all necessary React imports.

${authContext}
${integrationsContext}
Current code:
---
${code}
---
User request: "${message}"
---
New, modified code:`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: fullPrompt
            });

            let newCode = response.text;
            newCode = newCode.replace(/```(jsx|tsx)?\n?([\s\S]*?)\n?```/g, '$2').trim();

            if (newCode) {
                setCode(newCode);
                setChatHistory(prev => [...prev, { role: 'model', content: "I've updated the code. You can see the result in the preview." }]);
                setActiveView('preview');
            } else {
                throw new Error("Received an empty response from the AI.");
            }
        } catch (err: unknown) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setChatHistory(prev => [...prev, { role: 'model', content: `Sorry, I ran into an error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="h-screen w-screen bg-black font-sans">
            <Header 
                onNavigate={onNavigate} 
                user={user} 
                onLogout={onLogout}
                project={project}
                onUpdateProject={onUpdateProject}
                onPublish={() => setIsPublishing(true)}
            />
            <main className="flex h-full pt-16 text-white">
                <div className="w-full md:w-2/5 lg:w-1/3 h-full">
                    <ChatPanel
                    chatHistory={chatHistory}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    />
                </div>
                <div className="hidden md:block md:w-3/5 lg:w-2/3 h-full border-l border-white/10">
                    <EditorPreviewPanel
                    code={code}
                    onCodeChange={setCode}
                    transpiledCode={transpiledCode}
                    error={error}
                    activeView={activeView}
                    onViewChange={setActiveView}
                    />
                </div>
            </main>
            {isPublishing && <PublishModal projectId={project.id} onClose={() => setIsPublishing(false)} />}
        </div>
    );
};

export default ProjectPage;
