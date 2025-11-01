import React, { useState, useCallback } from 'react';
import CodeEditor from './CodeEditor';
import Preview from './Preview';
import GeneratingPreview, { Suggestion } from './GeneratingPreview';
import FileExplorer from './FileExplorer';

interface EditorPreviewPanelProps {
  files: { [key: string]: string };
  onFilesChange: (files: { [key: string]: string }) => void;
  isGeneratingInitial: boolean;
  suggestions: Suggestion[];
  onAddToChat: (prompt: string) => void;
  initialPrompt: string;
}

const EditorPreviewPanel: React.FC<EditorPreviewPanelProps> = ({ files, onFilesChange, isGeneratingInitial, suggestions, onAddToChat, initialPrompt }) => {
  const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
  const [activeFile, setActiveFile] = useState('App.js');
  
  const handleCodeChange = (newCode: string) => {
    onFilesChange({ ...files, [activeFile]: newCode });
  };
  
  // Ensure activeFile always exists in files
  if (!files[activeFile]) {
      const firstFile = Object.keys(files)[0] || 'App.js';
      if(activeFile !== firstFile) {
        setActiveFile(firstFile);
      }
  }

  const renderPreview = () => {
    if (isGeneratingInitial) {
      return <GeneratingPreview suggestions={suggestions} onAddToChat={onAddToChat} initialPrompt={initialPrompt} />;
    }
    return <Preview files={files} />;
  };

  return (
    <div className="h-full flex flex-col relative bg-[#1e1e1e]">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2">
        <div className="flex space-x-1 bg-black/30 backdrop-blur-md p-1 rounded-full border border-white/10">
          {['preview', 'code'].map((view) => (
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
          <div className="flex h-full w-full">
            <div className="w-1/3 max-w-xs h-full bg-[#181818] border-r border-white/10">
              <FileExplorer
                files={Object.keys(files)}
                activeFile={activeFile}
                onSelectFile={setActiveFile}
              />
            </div>
            <div className="flex-grow h-full">
              <CodeEditor
                value={files[activeFile] || ''}
                onChange={handleCodeChange}
              />
            </div>
          </div>
        )}
        {activeView === 'preview' && (
            <div className="h-full w-full bg-white">
              {renderPreview()}
            </div>
        )}
      </div>
    </div>
  );
};

export default EditorPreviewPanel;