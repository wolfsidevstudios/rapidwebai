import React, { useState, useEffect, useCallback } from 'react';
import ChatPanel from './components/ChatPanel';
import EditorPreviewPanel from './components/EditorPreviewPanel';
import HomePage from './components/HomePage'; // Import the new HomePage component
import useDebounce from './hooks/useDebounce';
// FIX: Use a value import for GoogleGenAI instead of a type-only import, as per @google/genai guidelines.
import { GoogleGenAI } from "@google/genai";

// FIX: Removed global window declaration as GoogleGenAI is now imported directly.

const DEFAULT_CODE = `import React from 'react';

const App = () => {
  return (
    <div className="flex flex-col gap-4 items-center justify-center h-full bg-gray-100 p-8 text-center">
      <h1 className="text-5xl font-bold text-gray-800">
        AI Code Assistant
      </h1>
      <p className="text-lg text-gray-600">
        I'm ready to build! Tell me what you want to create or change.
      </p>
    </div>
  );
};

export default App;
`;

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<'home' | 'editor'>('home'); // New state for app view
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [transpiledCode, setTranspiledCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debouncedCode = useDebounce(code, 500);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    setIsLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);

    try {
      // FIX: Instantiate GoogleGenAI directly from the import, as per @google/genai guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const fullPrompt = `You are an expert React developer specializing in modifying existing React components.
You will be given the current code for a single functional component and a user request for changes.
Your task is to apply the requested changes to the code and return the complete, updated code for the component.
Preserve the existing logic and structure as much as possible, only making the necessary modifications.
Return only the raw code for the component. Do not add any explanations, introductions, or markdown formatting like \`\`\`jsx.
The component must remain a default export and include all necessary React imports.

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
  
  const handleStartFromHome = (initialPrompt: string) => {
    setAppState('editor');
    handleSendMessage(initialPrompt);
  };
  
  if (appState === 'home') {
    return <HomePage onStart={handleStartFromHome} />;
  }


  return (
    <main className="flex h-screen bg-black text-white font-sans">
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
  );
};

export default App;