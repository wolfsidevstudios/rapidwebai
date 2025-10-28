import React, { useState } from 'react';
import CodeEditor from './CodeEditor';
import Preview from './Preview';
import useDebounce from '../hooks/useDebounce';

export interface ConsoleMessage {
    type: 'log' | 'warn' | 'error' | 'info' | 'debug';
    message: string;
    timestamp: Date;
}

interface EditorPreviewPanelProps {
  code: string;
  onCodeChange: (value: string) => void;
}

const ConsoleView: React.FC<{ messages: ConsoleMessage[] }> = ({ messages }) => {
    const getMessageColor = (type: ConsoleMessage['type']) => {
        switch (type) {
            case 'error': return 'text-red-400';
            case 'warn': return 'text-yellow-400';
            default: return 'text-gray-300';
        }
    };

    return (
        <div className="h-full bg-[#1e1e1e] font-mono text-sm p-4 overflow-y-auto">
            {messages.length === 0 ? (
                 <div className="text-gray-500">Console is empty.</div>
            ) : (
                messages.map((msg, index) => (
                    <div key={index} className={`flex items-start py-1 border-b border-white/10 ${getMessageColor(msg.type)}`}>
                        <span className="text-gray-500 mr-4">{msg.timestamp.toLocaleTimeString()}</span>
                        <pre className="whitespace-pre-wrap flex-grow">{msg.message}</pre>
                    </div>
                ))
            )}
        </div>
    );
};

const EditorPreviewPanel: React.FC<EditorPreviewPanelProps> = ({ code, onCodeChange }) => {
  const [activeView, setActiveView] = useState<'preview' | 'code' | 'console'>('preview');
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const debouncedCode = useDebounce(code, 500);

  const handleConsoleMessage = (message: ConsoleMessage) => {
    setConsoleMessages(prev => [...prev, message]);
  };
  
  const clearConsole = () => setConsoleMessages([]);

  return (
    <div className="h-full flex flex-col relative bg-[#1e1e1e]">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2">
        <div className="flex space-x-1 bg-black/30 backdrop-blur-md p-1 rounded-full border border-white/10">
          {['preview', 'code', 'console'].map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view as any)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                activeView === view
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>
        
      <div className="flex-grow h-full w-full overflow-hidden">
        {activeView === 'code' && (
          <CodeEditor value={code} onChange={onCodeChange} />
        )}
        {activeView === 'preview' && (
            <div className="h-full w-full bg-white">
              <Preview code={debouncedCode} onConsoleMessage={handleConsoleMessage} clearConsole={clearConsole} />
            </div>
        )}
        {activeView === 'console' && <ConsoleView messages={consoleMessages} />}
      </div>
    </div>
  );
};

export default EditorPreviewPanel;