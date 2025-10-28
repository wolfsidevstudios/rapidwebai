import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatPanel from './ChatPanel';
import EditorPreviewPanel from './EditorPreviewPanel';
import type { Project } from '../App';
import { GoogleGenAI } from "@google/genai";
import PublishModal from './PublishModal';

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
    const [files, setFiles] = useState(project.files);
    const [activeFile, setActiveFile] = useState('src/App.jsx');
    const [chatHistory, setChatHistory] = useState(project.chatHistory);
    const [isLoading, setIsLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [selectedApis, setSelectedApis] = useState<string[]>([]);
    
    const [isEditingName, setIsEditingName] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Project State Management ---
    useEffect(() => {
        onUpdateProject({ ...project, files, chatHistory, name: projectName });
    }, [files, chatHistory, projectName]);
    
    const handleFileContentChange = (newContent: string) => {
        setFiles(prev => ({...prev, [activeFile]: newContent}));
    }

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
            if (project.id === event.detail.projectId && chatHistory.length === 0) {
                handleSendMessage(event.detail.message);
            }
        };
        // @ts-ignore
        window.addEventListener('startProjectWithMessage', handleInitialMessage);
        // @ts-ignore
        return () => window.removeEventListener('startProjectWithMessage', handleInitialMessage);
    }, [project.id]);

    const handleSendMessage = async (message: string) => {
        if (!message.trim()) return;
        setIsLoading(true);
        const newHistory = [...chatHistory, { role: 'user', content: message }];
        setChatHistory(newHistory);

        const currentSelectedApis = [...selectedApis];
        setSelectedApis([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const fullPrompt = `You are an expert full-stack React developer AI. Your task is to modify a React application based on the user's request.

You MUST return your response as a single, valid JSON object that represents the *changes* to the file system.

**Instructions for the JSON response:**
1.  **JSON ONLY**: Your entire output MUST be a single JSON object. Do not include any text, explanations, or markdown formatting like \`\`\`json before or after the JSON block.
2.  **Only Include Changes**: The JSON object should ONLY contain entries for files that are new, have been modified, or should be deleted. Do NOT return the entire file structure.
3.  **To Add/Modify a File**: Set the key to the full file path (e.g., "src/components/NewComponent.jsx") and the value to the new string content of the file.
4.  **To Delete a File**: Set the key to the full file path (e.g., "src/old-component.jsx") and the value to \`null\`.
5.  **Best Practices**: Write clean, readable, and maintainable React code. Ensure all imports are correct. If a new dependency is needed, add it to \`package.json\`.
6.  **Styling**: Use standard CSS in a single \`src/styles.css\` file. This file MUST be imported in \`src/main.jsx\`. Apply styles using standard \`className\` attributes.
7.  **Assets (Images, Fonts)**: Do not use local image or font files. Instead, use absolute URLs to public assets.

**Current file structure (for your reference):**
---
${JSON.stringify(files, null, 2)}
---
**User request:** "${message}"
---
**JSON object with file changes:**`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: fullPrompt,
                config: { responseMimeType: 'application/json' }
            });

            const responseText = response.text.trim();
            const fileChanges = JSON.parse(responseText);

            if (typeof fileChanges === 'object' && fileChanges !== null) {
                let activeFileStillExists = false;
                setFiles(currentFiles => {
                    const updatedFiles = { ...currentFiles };
                    for (const path in fileChanges) {
                        if (fileChanges[path] === null) {
                            delete updatedFiles[path];
                        } else {
                            updatedFiles[path] = fileChanges[path];
                        }
                    }
                    activeFileStillExists = !!updatedFiles[activeFile];
                    return updatedFiles;
                });

                setChatHistory(prev => [...prev, { role: 'model', content: "I've updated the application files. Check out the preview and the new console for debugging!" }]);
                
                // If the active file was deleted, select a new one.
                if (!activeFileStillExists) {
                    setFiles(currentFiles => {
                         setActiveFile(Object.keys(currentFiles).find(k => k.startsWith('src/')) || 'src/App.jsx');
                         return currentFiles;
                    });
                }
            } else {
                throw new Error("AI returned an invalid response. Expected a JSON object of file changes.");
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
                    <ChatPanel chatHistory={chatHistory} onSendMessage={handleSendMessage} isLoading={isLoading} selectedApis={selectedApis} onSelectedApisChange={setSelectedApis} />
                </div>
                <div className="w-3/5 h-full">
                    <EditorPreviewPanel
                        files={files}
                        activeFile={activeFile}
                        onFileSelect={setActiveFile}
                        fileContent={files[activeFile] || ''}
                        onFileContentChange={handleFileContentChange}
                    />
                </div>
            </main>
            {isPublishing && <PublishModal projectId={project.id} onClose={() => setIsPublishing(false)} />}
        </div>
    );
};

export default ProjectPage;