import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatPanel from './ChatPanel';
import EditorPreviewPanel from './EditorPreviewPanel';
import FileExplorer from './FileExplorer';
import type { Project } from '../App';
import { GoogleGenAI } from "@google/genai";
import PublishModal from './PublishModal';

// @ts-ignore - esbuild is loaded from a script tag in index.html
const esbuild = window.esbuild;

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
    const [bundledCode, setBundledCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
    const [isLoading, setIsLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [selectedApis, setSelectedApis] = useState<string[]>([]);
    
    const [isEditingName, setIsEditingName] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const inputRef = useRef<HTMLInputElement>(null);

    const esbuildInitialized = useRef(false);

    // --- ESBuild Bundler ---
    const initializeEsbuild = async () => {
        if (esbuildInitialized.current || !esbuild) return;
        try {
            await esbuild.initialize({
                wasmURL: 'https://unpkg.com/esbuild-wasm@0.21.4/esbuild.wasm',
                worker: true,
            });
            esbuildInitialized.current = true;
        } catch(e) {
            console.error("Failed to initialize esbuild", e);
        }
    };

    useEffect(() => {
        initializeEsbuild();
    }, []);

    const bundleProject = useCallback(async (projectFiles: Record<string, string>) => {
        if (!esbuildInitialized.current) {
            setError('Waiting for bundler to initialize...');
            setTimeout(() => bundleProject(projectFiles), 1000);
            return;
        }
        setError(null);

        try {
            const result = await esbuild.build({
                entryPoints: ['src/main.jsx'],
                bundle: true,
                write: false,
                plugins: [{
                    name: 'in-memory-file-loader',
                    setup(build: any) {
                        build.onResolve({ filter: /.*/ }, (args: any) => {
                             if (args.path === 'src/main.jsx') {
                                return { path: args.path, namespace: 'in-memory' };
                            }
                            if (args.path.startsWith('./') || args.path.startsWith('../')) {
                               const path = new URL(args.path, 'file://' + args.resolveDir + '/').pathname.substring(1);
                               const potentialPaths = [
                                 path, `${path}.js`, `${path}.jsx`, `${path}.ts`, `${path}.tsx`, `${path}.css`,
                                 `${path}/index.js`, `${path}/index.jsx`, `${path}/index.ts`, `${path}/index.tsx`
                               ];
                               for (const p of potentialPaths) {
                                   if (projectFiles[p]) return { path: p, namespace: 'in-memory' };
                               }
                            }
                            return { path: args.path, external: true };
                        });
                        build.onLoad({ filter: /.*/, namespace: 'in-memory' }, (args: any) => {
                            const fileContent = projectFiles[args.path];
                            if (fileContent === undefined) return { errors: [{ text: `File not found: ${args.path}` }] };
                            
                            let loader = 'jsx';
                            if (args.path.endsWith('.css')) loader = 'css';
                            
                            return {
                                contents: fileContent,
                                loader: loader,
                                resolveDir: args.path.substring(0, args.path.lastIndexOf('/'))
                            };
                        });
                    }
                }],
                define: { 'process.env.NODE_ENV': '"production"' },
                jsxFactory: 'React.createElement',
                jsxFragment: 'React.Fragment',
            });
            setBundledCode(result.outputFiles[0].text);
            setError(null);
        } catch (err: any) {
            setError(err.message.split('\n').slice(0, 5).join('\n'));
            setBundledCode(null);
        }
    }, []);

    useEffect(() => {
        bundleProject(files);
    }, [files, bundleProject]);

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
            
            // NOTE: Integration context generation is omitted for brevity but would be similar to the previous version.
            
            const fullPrompt = `You are an expert full-stack React developer AI. Your task is to generate or modify a complete multi-file React application based on the user's request.

You MUST return your response as a single, valid JSON object. This object represents the file system of the React application.
The keys of the JSON object are the full file paths (e.g., "src/components/Button.jsx").
The values are the string content of those files.

Follow this standard project structure:
- \`public/index.html\`: The main HTML file.
- \`src/main.jsx\`: The application entry point (renders App). It must import a stylesheet.
- \`src/App.jsx\`: The root component.
- \`src/components/\`: Reusable components.
- \`src/styles.css\`: A stylesheet imported by main.jsx.
- \`package.json\`: Project dependencies.

IMPORTANT RULES:
1.  **JSON ONLY**: Your entire output MUST be a single JSON object. Do not include any text, explanations, or markdown formatting like \`\`\`json before or after the JSON block.
2.  **Complete Structure**: You must return ALL the files for the project, not just the ones you changed. Start from the provided "Current file structure".
3.  **Entry Point**: The application must have an entry point at \`src/main.jsx\`.
4.  **Dependencies**: List required dependencies in \`package.json\`.
5.  **Runnable Code**: All files must contain complete, runnable code. Do not use placeholder comments.
6.  **Imports**: Use standard ES6 imports. Relative imports (\`import Button from './components/Button.jsx'\`) are required.

Current file structure (as a JSON object):
---
${JSON.stringify(files, null, 2)}
---
User request: "${message}"
---
New file structure (as a JSON object):`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: fullPrompt,
                config: { responseMimeType: 'application/json' }
            });

            const responseText = response.text.trim();
            const newFiles = JSON.parse(responseText);

            if (typeof newFiles === 'object' && newFiles !== null && Object.keys(newFiles).length > 0) {
                setFiles(newFiles);
                setChatHistory(prev => [...prev, { role: 'model', content: "I've updated the application files. Take a look at the file explorer and the preview!" }]);
                setActiveView('preview');
                // Ensure the active file still exists
                if (!newFiles[activeFile]) {
                    setActiveFile(Object.keys(newFiles).find(k => k.startsWith('src/')) || 'src/App.jsx');
                }
            } else {
                throw new Error("Received an invalid or empty file structure from the AI.");
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
                <div className="w-[250px] h-full border-r border-white/10 shrink-0">
                    <FileExplorer files={files} activeFile={activeFile} onFileSelect={setActiveFile} />
                </div>
                <div className="flex-grow w-2/5 h-full">
                    <ChatPanel chatHistory={chatHistory} onSendMessage={handleSendMessage} isLoading={isLoading} selectedApis={selectedApis} onSelectedApisChange={setSelectedApis} />
                </div>
                <div className="flex-grow w-3/5 h-full border-l border-white/10">
                    <EditorPreviewPanel
                        fileContent={files[activeFile] || ''}
                        onFileContentChange={handleFileContentChange}
                        bundledCode={bundledCode}
                        error={error}
                        activeView={activeView}
                        onViewChange={setActiveView}
                        activeFile={activeFile}
                    />
                </div>
            </main>
            {isPublishing && <PublishModal projectId={project.id} onClose={() => setIsPublishing(false)} />}
        </div>
    );
};

export default ProjectPage;
