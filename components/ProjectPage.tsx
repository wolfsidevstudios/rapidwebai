

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatPanel from './ChatPanel';
import EditorPreviewPanel from './EditorPreviewPanel';
import type { Project, ChatMessage } from '../App';
import { GoogleGenAI, Type } from "@google/genai";
import PublishModal from './PublishModal';
import type { Suggestion } from './GeneratingPreview';


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

const codeGenerationPrompt = (currentFiles: object, message: string, selectedApis: string[]) => `You are an expert web developer specializing in Next.js, Tailwind CSS, and TypeScript.
Your task is to modify a set of project files based on a user's request.
The user wants to build a web application.

**PWA & OFFLINE SUPPORT:**
This is a Progressive Web App (PWA) project configured with the 'next-pwa' plugin. The goal is to make the application fully offline-capable.
- The service worker and caching for static assets are handled automatically by 'next-pwa'. You DO NOT need to create or modify service worker files.
- Your primary PWA-related task is to update 'public/manifest.json'. Modify the 'name', 'short_name', and 'description' fields to be relevant to the user's request. You can also update 'theme_color' and 'background_color' if appropriate.
- For applications that fetch data (e.g., from an API), implement a strategy to make this data available offline. A good approach is to cache API responses using localStorage or IndexedDB. When the app is offline, retrieve data from the cache. When online, fetch fresh data and update the cache.

Current project files:
${JSON.stringify(currentFiles, null, 2)}

User's request: "${message}"

${selectedApis.length > 0 ? `The user has enabled the following APIs: ${selectedApis.join(', ')}. You can use them if needed. Ensure that data fetched from these APIs is cached for offline use.` : ''}

Analyze the user's request and the current file structure.
Generate a complete and updated set of files to fulfill the request.
The main page to display is 'pages/index.tsx'. Ensure it is fully functional and styled.
The generated code must be fully functional. For interactive applications (like a to-do list, forms, etc.), ensure all client-side logic is implemented correctly (e.g., state management with React hooks for adding, deleting, and updating data) so the application is interactive and usable.
Do not truncate code or use placeholders like \`// ...\`. Provide the complete, runnable code for each file.
If you need to add dependencies, update package.json.
Your response MUST be a JSON object with file paths as keys and their full content as string values.
You must return all project files, including 'package.json', 'next.config.js', 'public/manifest.json', etc., even if they are unchanged.
Example response format:
{
  "pages/index.tsx": "...",
  "styles/globals.css": "...",
  "package.json": "...",
  "public/manifest.json": "..."
}
`;


interface ProjectPageProps {
    project: Project;
    onUpdateProject: (updatedProject: Project) => void;
}

const ProjectPage: React.FC<ProjectPageProps> = ({ project, onUpdateProject }) => {
    const [files, setFiles] = useState(project.files);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>(project.chatHistory);
    const [isLoading, setIsLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [selectedApis, setSelectedApis] = useState<string[]>([]);
    
    const [isGeneratingInitial, setIsGeneratingInitial] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [initialPrompt, setInitialPrompt] = useState('');

    const [chatInput, setChatInput] = useState('');
    
    const [isEditingName, setIsEditingName] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const inputRef = useRef<HTMLInputElement>(null);
    const isInitialMount = useRef(true);

    // --- Project State Management ---
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        onUpdateProject({ ...project, files, chatHistory, name: projectName });
    }, [files, chatHistory, projectName, onUpdateProject, project]);

    useEffect(() => {
        setFiles(project.files);
        setChatHistory(project.chatHistory);
        setProjectName(project.name);
    }, [project]);

     useEffect(() => {
        if (isEditingName) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditingName]);

    const handleNameUpdate = () => {
        if (projectName.trim()) {
            setIsEditingName(false);
        } else {
            setProjectName(project.name); // Revert if empty
        }
        setIsEditingName(false);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleNameUpdate();
        } else if (e.key === 'Escape') {
            setProjectName(project.name);
            setIsEditingName(false);
        }
    };
    
    const callGemini = async (message: string, image?: string) => {
        setIsLoading(true);
        const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: message, image }];
        setChatHistory(newHistory);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = 'gemini-2.5-pro';
            const currentFiles = files;

            const fullPrompt = codeGenerationPrompt(currentFiles, message, selectedApis);

            const parts: any[] = [{ text: fullPrompt }];
            if (image) {
                const mimeType = image.split(';')[0].split(':')[1];
                const base64Data = image.split(',')[1];
                parts.push({
                    inlineData: {
                        mimeType,
                        data: base64Data,
                    },
                });
            }

            const config: any = {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        "pages/index.tsx": { type: Type.STRING },
                        "styles/globals.css": { type: Type.STRING },
                        "package.json": { type: Type.STRING },
                        "tailwind.config.js": { type: Type.STRING },
                        "next.config.js": { type: Type.STRING },
                        "public/manifest.json": { type: Type.STRING },
                        "pages/_document.tsx": { type: Type.STRING },
                        "pages/_app.tsx": { type: Type.STRING },
                    },
                    required: [
                        "pages/index.tsx", 
                        "styles/globals.css", 
                        "package.json", 
                        "tailwind.config.js",
                        "next.config.js",
                        "public/manifest.json",
                        "pages/_document.tsx",
                        "pages/_app.tsx"
                    ],
                    additionalProperties: { type: Type.STRING }
                },
            };

            const response = await ai.models.generateContent({
                model: model,
                contents: { parts: parts },
                config: config,
            });
            
            const responseText = response.text;
            const updatedFiles = JSON.parse(responseText);
            setFiles(updatedFiles);
            setChatHistory(prev => [...prev, { role: 'model', content: "I've updated the files based on your request." }]);
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            const errorMessage = (error as Error).message || "An unknown error occurred.";
            setChatHistory(prev => [...prev, { role: 'model', content: `Sorry, I ran into an error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const onSendMessage = callGemini;
    
    useEffect(() => {
        const handleStart = async (event: Event) => {
            const { projectId } = (event as CustomEvent).detail;
            if (projectId !== project.id) return;

            const userMessage = project.chatHistory.find(m => m.role === 'user');
            if (!userMessage) return;

            setIsGeneratingInitial(true);
            setInitialPrompt(userMessage.content);
            
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const model = 'gemini-2.5-pro';
                const currentFiles = project.files;

                const fullPrompt = codeGenerationPrompt(currentFiles, userMessage.content, []);
                
                const parts: any[] = [{ text: fullPrompt }];
                if (userMessage.image) {
                    const mimeType = userMessage.image.split(';')[0].split(':')[1];
                    const base64Data = userMessage.image.split(',')[1];
                    parts.push({
                        inlineData: {
                            mimeType,
                            data: base64Data,
                        },
                    });
                }

                const config: any = {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            "pages/index.tsx": { type: Type.STRING },
                            "styles/globals.css": { type: Type.STRING },
                            "package.json": { type: Type.STRING },
                            "tailwind.config.js": { type: Type.STRING },
                            "next.config.js": { type: Type.STRING },
                            "public/manifest.json": { type: Type.STRING },
                            "pages/_document.tsx": { type: Type.STRING },
                            "pages/_app.tsx": { type: Type.STRING },
                        },
                        required: [
                            "pages/index.tsx", 
                            "styles/globals.css", 
                            "package.json", 
                            "tailwind.config.js",
                            "next.config.js",
                            "public/manifest.json",
                            "pages/_document.tsx",
                            "pages/_app.tsx"
                        ],
                        additionalProperties: { type: Type.STRING }
                    },
                };

                const [fileGenResponse, suggestionResponse] = await Promise.all([
                    ai.models.generateContent({
                        model: model,
                        contents: { parts: parts },
                        config: config,
                    }),
                    ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `Based on the user's request to build "${userMessage.content}", generate 3-5 creative and useful follow-up suggestions for features to add next. Return a JSON object with a single key "suggestions", which is an array of objects. Each object should have "title", "description", and "prompt" keys. "prompt" should be a concise instruction for the AI to implement that feature.`,
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    suggestions: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                title: { type: Type.STRING },
                                                description: { type: Type.STRING },
                                                prompt: { type: Type.STRING },
                                            },
                                            required: ["title", "description", "prompt"]
                                        }
                                    }
                                },
                                required: ["suggestions"]
                            }
                        }
                    })
                ]);
                
                const responseText = fileGenResponse.text;
                const updatedFiles = JSON.parse(responseText);
                setFiles(updatedFiles);

                const suggestionsText = suggestionResponse.text;
                const parsedSuggestions = JSON.parse(suggestionsText);
                setSuggestions(parsedSuggestions.suggestions || []);

                setChatHistory(prev => [...prev, { role: 'model', content: "I've created the initial files for your project." }]);
            } catch (error) {
                console.error("Error calling Gemini API for initial generation:", error);
                const errorMessage = (error as Error).message || "An unknown error occurred.";
                setChatHistory(prev => [...prev, { role: 'model', content: `Sorry, I ran into an error during initial setup: ${errorMessage}` }]);
            } finally {
                setIsGeneratingInitial(false);
            }
        };

        window.addEventListener('startProjectWithMessage', handleStart);
        return () => window.removeEventListener('startProjectWithMessage', handleStart);
    }, [project.id, project.files, project.chatHistory]);

    const handleAddToChat = useCallback((prompt: string) => {
        setChatInput(prompt);
    }, []);

    return (
        <div className="h-full w-full flex bg-black relative">
            <div className="w-[450px] h-full border-r border-white/10 flex-shrink-0">
                <ChatPanel
                    chatHistory={chatHistory}
                    onSendMessage={onSendMessage}
                    isLoading={isLoading}
                    selectedApis={selectedApis}
                    onSelectedApisChange={setSelectedApis}
                    chatInput={chatInput}
                    onChatInputChange={setChatInput}
                />
            </div>
            <div className="flex-grow h-full">
                <EditorPreviewPanel
                    files={files}
                    onFilesChange={setFiles}
                    isGeneratingInitial={isGeneratingInitial}
                    suggestions={suggestions}
                    onAddToChat={handleAddToChat}
                    initialPrompt={initialPrompt}
                />
            </div>
            {isPublishing && <PublishModal projectId={project.id} onClose={() => setIsPublishing(false)} />}
             <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={() => setIsPublishing(true)}
                    className="px-4 py-2 rounded-full text-sm font-semibold transition-colors bg-white text-black hover:bg-gray-200"
                >
                    Publish
                </button>
            </div>
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
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
            </div>
        </div>
    );
};

export default ProjectPage;