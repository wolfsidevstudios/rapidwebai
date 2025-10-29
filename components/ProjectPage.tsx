
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatPanel from './ChatPanel';
import EditorPreviewPanel from './EditorPreviewPanel';
// FIX: Import ChatMessage type to correctly type the chatHistory state.
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

interface ProjectPageProps {
    project: Project;
    onUpdateProject: (updatedProject: Project) => void;
}

const ProjectPage: React.FC<ProjectPageProps> = ({ project, onUpdateProject }) => {
    const [code, setCode] = useState(project.code);
    // FIX: Explicitly type the chatHistory state to prevent type inference issues with the 'role' property.
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>(project.chatHistory);
    const [isLoading, setIsLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [selectedApis, setSelectedApis] = useState<string[]>([]);
    
    // State for the new generating UI
    const [isGeneratingInitial, setIsGeneratingInitial] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [initialPrompt, setInitialPrompt] = useState('');

    // Centralized chat input state
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
        onUpdateProject({ ...project, code, chatHistory, name: projectName });
    }, [code, chatHistory, projectName]);
    
    // --- Project Name Edit ---
    useEffect(() => { setProjectName(project.name); }, [project.name]);
    useEffect(() => { if (isEditingName) inputRef.current?.focus(); }, [isEditingName]);

    const handleNameUpdate = () => {
        if (projectName.trim()) {
            onUpdateProject({ ...project, name: projectName.trim() });
        } else {
            setProjectName(project.name);
        }
        setIsEditingName(false);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleNameUpdate();
        else if (e.key === 'Escape') {
            setProjectName(project.name);
            setIsEditingName(false);
        }
    };
    
    // --- AI Chat ---
    useEffect(() => {
        const handleInitialMessage = (event: CustomEvent) => {
            if (project.id === event.detail.projectId && chatHistory.length === 1 && project.chatHistory.length === 1) {
                const firstMessage = project.chatHistory[0];
                if (firstMessage) {
                    handleSendMessage(firstMessage.content, firstMessage.image);
                }
            }
        };
        // @ts-ignore
        window.addEventListener('startProjectWithMessage', handleInitialMessage);
        // @ts-ignore
        return () => window.removeEventListener('startProjectWithMessage', handleInitialMessage);
    }, [project.id, project.chatHistory]);


    const getFeatureSuggestions = async (message: string) => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Based on the following app idea, suggest 3 creative features. For each feature, provide a short title (max 5 words), a one-sentence description, and a concise prompt that a user could give to an AI developer to implement it. App Idea: "${message}"`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                prompt: { type: Type.STRING },
                            },
                            required: ["title", "description", "prompt"],
                        },
                    },
                },
            });
            const suggestedFeatures = JSON.parse(response.text);
            setSuggestions(suggestedFeatures);
        } catch (error) {
            console.error("Failed to fetch feature suggestions:", error);
            // Don't show an error to the user, just fail gracefully
            setSuggestions([]); 
        }
    };

    const handleSendMessage = async (message: string, image?: string) => {
        if (!message.trim() && !image) return;
        setIsLoading(true);
        const newUserMessage: ChatMessage = { role: 'user' as const, content: message };
        if (image) {
            newUserMessage.image = image;
        }
        const newHistory = [...chatHistory, newUserMessage];
        setChatHistory(newHistory);

        // Handle initial generation UI
        const isInitial = chatHistory.length === 0;
        if (isInitial) {
            const displayPrompt = message || 'your visual idea';
            setInitialPrompt(displayPrompt);
            setIsGeneratingInitial(true);
            if (message) getFeatureSuggestions(message); // Fire and forget for text prompts
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const systemInstruction = `You are an expert frontend web developer AI. Your task is to create and modify beautiful, fully-functional single-page web applications using HTML, Tailwind CSS, and vanilla JavaScript. You will be given a user request and the current HTML code, and you must return the updated, complete HTML file content.

**Core Principles:**
1.  **Functionality First**: The application must be fully functional and interactive. Use vanilla JavaScript for all logic, state management, and DOM manipulation.
2.  **Human-Centric Design**: Create beautiful, modern, and intuitive user interfaces. The design should feel clean and human-made, not like a generic template.
3.  **API Integration**: When external data is needed (e.g., weather, news, products), use the browser's \`fetch\` API to call real, public APIs. If an API key is required, use a placeholder and add a comment explaining where to add the real key.

**Design Guidelines:**
1.  **Background**: The main application background must be white (\`<body class="bg-white">\`).
2.  **Buttons**: All buttons must be pill-shaped (e.g., \`rounded-full\`).
3.  **Layout & Spacing**: Use generous spacing, a clear visual hierarchy, and a well-organized layout. Use flexbox or grid for alignment.
4.  **Typography**: Use clean, modern fonts. Ensure text is readable with appropriate sizes and weights.
5.  **Color Palette**: Use a thoughtful and appealing color palette that complements the white background. Use subtle grays for text and borders, and one or two accent colors for interactive elements.

**Technical Requirements:**
1.  **SINGLE HTML FILE ONLY**: Your entire output MUST be a single, complete \`index.html\` file. Do NOT use markdown formatting like \`\`\`html. Start with \`<!DOCTYPE html>\` and end with \`</html>\`.
2.  **SELF-CONTAINED**: All HTML, CSS (via Tailwind classes), and JavaScript must be included in this single file.
3.  **TAILWIND CSS**: Use Tailwind CSS for all styling. Include the Tailwind CDN script in the \`<head>\`: \`<script src="https://cdn.tailwindcss.com"></script>\`. Do not use \`<style>\` tags or inline \`style\` attributes unless absolutely necessary for dynamic styles.
4.  **JAVASCRIPT**: All JavaScript code must be placed within a \`<script>\` tag at the end of the \`<body>\`. Do not use any external libraries or frameworks like React, Vue, or jQuery. Use modern JavaScript (ES6+).`;
            
            const userMessageParts: any[] = [];
            if (image) {
                const [header, data] = image.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
                userMessageParts.push({
                    inlineData: { mimeType, data },
                });
            }
            const textContent = `**User request:** "${message}"\n\n**Current Code:**\n---\n${code}\n---\n**Updated complete HTML file:**`;
            userMessageParts.push({ text: textContent });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: [{ parts: userMessageParts }],
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            const responseText = response.text.trim();
            setCode(responseText);
            setChatHistory(prev => [...prev, { role: 'model', content: "I've updated the application. Check out the new preview!" }]);
            
        } catch (err: unknown) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setChatHistory(prev => [...prev, { role: 'model', content: `Sorry, I ran into an error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
            setIsGeneratingInitial(false); // End the special generating UI state
        }
    };

    return (
        <div className="h-full w-full bg-black font-sans flex flex-col">
            <header className="shrink-0 z-40 bg-black/30 backdrop-blur-lg border-b border-white/10 text-white">
                <div className="flex justify-between items-center p-4 h-16">
                    <div className="flex items-center group">
                        {isEditingName ? (
                            <div className="flex items-center space-x-2">
                                <input ref={inputRef} type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} onKeyDown={handleInputKeyDown} onBlur={handleNameUpdate} className="bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                <button onClick={handleNameUpdate} className="p-1.5 bg-blue-600 rounded-md hover:bg-blue-500 transition-colors"><CheckIcon /></button>
                            </div>
                        ) : (
                            <div onClick={() => setIsEditingName(true)} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white/10 transition-colors">
                                <h1 className="text-lg font-medium text-white/90">{projectName}</h1>
                                <span className="opacity-0 group-hover:opacity-60 transition-opacity"><EditIcon /></span>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setIsPublishing(true)} className="px-4 py-2 rounded-full text-sm font-semibold transition-colors bg-white text-black hover:bg-gray-200">Publish</button>
                </div>
            </header>
            
            <main className="flex flex-grow text-white min-h-0">
                <div className="w-2/5 h-full border-r border-white/10">
                    <ChatPanel 
                        chatHistory={chatHistory} 
                        onSendMessage={handleSendMessage} 
                        isLoading={isLoading} 
                        selectedApis={selectedApis} 
                        onSelectedApisChange={setSelectedApis}
                        chatInput={chatInput}
                        onChatInputChange={setChatInput}
                    />
                </div>
                <div className="w-3/5 h-full">
                    <EditorPreviewPanel
                        code={code}
                        onCodeChange={setCode}
                        isGeneratingInitial={isGeneratingInitial}
                        suggestions={suggestions}
                        onAddToChat={setChatInput}
                        initialPrompt={initialPrompt}
                    />
                </div>
            </main>
            {isPublishing && <PublishModal projectId={project.id} onClose={() => setIsPublishing(false)} />}
        </div>
    );
};

export default ProjectPage;
