import React, { useState } from 'react';
import CodeEditor from './CodeEditor';
import Preview from './Preview';
import PublishModal from './PublishModal';

interface EditorPreviewPanelProps {
  code: string;
  onCodeChange: (value: string) => void;
  transpiledCode: string | null;
  error: string | null;
  activeView: 'code' | 'preview';
  onViewChange: (view: 'code' | 'preview') => void;
  projectId: string;
}

const EditorPreviewPanel: React.FC<EditorPreviewPanelProps> = ({
  code,
  onCodeChange,
  transpiledCode,
  error,
  activeView,
  onViewChange,
  projectId,
}) => {
  const [isPublishing, setIsPublishing] = useState(false);

  return (
    <div className="h-full flex flex-col relative bg-[#1e1e1e]">
      {isPublishing && <PublishModal projectId={projectId} onClose={() => setIsPublishing(false)} />}
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
        <button 
          onClick={() => setIsPublishing(true)}
          className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors bg-white text-black hover:bg-gray-200"
        >
          Publish
        </button>
      </div>
        
      <div className="flex-grow h-full w-full overflow-hidden">
        {activeView === 'code' ? (
            <div className="h-full flex flex-col">
                 <CodeEditor value={code} onChange={onCodeChange} />
                 {error && (
                    <div className="bg-red-900 text-red-200 p-4 overflow-auto text-sm font-mono shrink-0" style={{maxHeight: '150px'}}>
                        <pre className="whitespace-pre-wrap">{error}</pre>
                    </div>
                 )}
            </div>
        ) : (
            <div className="h-full w-full p-4">
              <div className="bg-gray-300 h-full w-full rounded-2xl overflow-hidden">
                  <Preview code={transpiledCode} />
              </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default EditorPreviewPanel;