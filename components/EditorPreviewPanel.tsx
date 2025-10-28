import React from 'react';
import CodeEditor from './CodeEditor';
import Preview from './Preview';

interface EditorPreviewPanelProps {
  fileContent: string;
  onFileContentChange: (value: string) => void;
  bundledCode: string | null;
  error: string | null;
  activeView: 'code' | 'preview';
  onViewChange: (view: 'code' | 'preview') => void;
  activeFile: string;
}

const EditorPreviewPanel: React.FC<EditorPreviewPanelProps> = ({
  fileContent,
  onFileContentChange,
  bundledCode,
  error,
  activeView,
  onViewChange,
  activeFile
}) => {

  return (
    <div className="h-full flex flex-col relative bg-[#1e1e1e]">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2">
        <div className="flex space-x-1 bg-black/30 backdrop-blur-md p-1 rounded-full border border-white/10">
          <button
            onClick={() => onViewChange('preview')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeView === 'preview'
                ? 'bg-white text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => onViewChange('code')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeView === 'code'
                ? 'bg-white text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Code
          </button>
        </div>
      </div>
        
      <div className="flex-grow h-full w-full overflow-hidden">
        {activeView === 'code' ? (
            <div className="h-full flex flex-col">
                 <div className="bg-[#2a2a2a] text-gray-400 px-4 py-2 text-sm font-mono border-b border-white/10">
                    {activeFile}
                 </div>
                 <CodeEditor value={fileContent} onChange={onFileContentChange} />
                 {error && (
                    <div className="bg-red-900 text-red-200 p-4 overflow-auto text-sm font-mono shrink-0" style={{maxHeight: '150px'}}>
                        <h3 className="font-bold text-red-100 mb-2">Bundler Error:</h3>
                        <pre className="whitespace-pre-wrap">{error}</pre>
                    </div>
                 )}
            </div>
        ) : (
            <div className="h-full w-full p-4">
              <div className="bg-white h-full w-full rounded-2xl overflow-hidden">
                  <Preview code={bundledCode} />
              </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default EditorPreviewPanel;