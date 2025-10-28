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
            plugins: [
                // Ensure Babel transpiles ES modules to CommonJS for our custom 'require'
                ["@babel/plugin-transform-modules-commonjs"]
            ]
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
            
            // --- Firebase Context ---
            let firebaseContext = '';
            const firebaseConfigRaw = localStorage.getItem('integration_key_firebase');
            if (firebaseConfigRaw) {
                try {
                    const firebaseConfig = JSON.parse(firebaseConfigRaw);
                    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
                        firebaseContext = `
---
MANDATORY: Full-Stack App Generation with Firebase

You are no longer just a component builder. You are a full-stack application architect. If the user's request requires backend functionality (like user accounts, saving data, real-time features), you MUST use Firebase. You will generate a single React component file that includes all necessary logic. The user mentioned "insforge", which you should interpret as Firebase.

1.  **Firebase Configuration**: The user has provided their Firebase configuration. You MUST use it to initialize Firebase within the component file. Do NOT use placeholder values.

    Firebase Config:
    \`\`\`json
    ${JSON.stringify(firebaseConfig, null, 2)}
    \`\`\`

2.  **Firebase Initialization**:
    -   You MUST import necessary Firebase services at the top of the file (e.g., \`import { initializeApp } from "firebase/app";\`, \`import { getAuth } from "firebase/auth";\`, \`import { getFirestore } from "firebase/firestore";\`).
    -   Initialize Firebase right after imports, before the component definition.

    **Example Initialization Pattern:**

    \`\`\`jsx
    import React, { useState, useEffect } from 'react';
    import { initializeApp } from "firebase/app";
    import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
    import { getFirestore, collection, addDoc, getDocs, onSnapshot, serverTimestamp } from "firebase/firestore";

    // IMPORTANT: Use the user's provided config here
    const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const App = () => {
      // ... component logic using auth and db
    };

    export default App;
    \`\`\`

3.  **Authentication**:
    -   Use Firebase Authentication for user management. This REPLACES any previous Google Sign-In instructions.
    -   Provide a clear way for users to sign in (e.g., a "Sign in with Google" button).
    -   Use \`onAuthStateChanged\` to listen for auth state changes and update the UI accordingly.

4.  **Database (Firestore)**:
    -   Use Cloud Firestore for data persistence.
    -   When a user wants to save data (e.g., create a post, submit a form), use Firestore to store it.
    -   Structure data logically in collections and documents. For example, a to-do app might have a 'todos' collection.
    -   Fetch and display data from Firestore. Use real-time listeners (\`onSnapshot\`) for a dynamic experience.

5.  **Important Rules**:
    -   You MUST integrate Firebase functionality seamlessly into the UI/UX of the component requested by the user.
    -   You are generating a single file. All Firebase setup and component logic must be in this one file.
    -   If the user does not request backend features, you can generate a simple, frontend-only component. Use your judgment. A "simple landing page" probably doesn't need a database. A "note-taking app" definitely does.
---
`;
                    }
                } catch (e) { console.error("Could not parse firebase config", e); }
            }
            
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


            const fullPrompt = `You are an expert full-stack React developer specializing in creating and modifying single-file React applications.
You will be given the current code and a user request for changes.
Your task is to apply the requested changes and return the complete, updated code for the application.
Preserve existing logic and structure as much as possible, only making the necessary modifications.
Return only the raw code. Do not add any explanations, introductions, or markdown formatting like \`\`\`jsx.
The component must remain a default export and include all necessary React imports.

${firebaseContext}
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
                setChatHistory(prev => [...prev, { role: 'model', content: "I've updated the code with full-stack capabilities. Check out the preview!" }]);
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