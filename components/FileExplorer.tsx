import React from 'react';

const FileExplorer: React.FC<{
  files: string[];
  activeFile: string;
  onSelectFile: (path: string) => void;
}> = ({ files, activeFile, onSelectFile }) => {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-white font-semibold p-3 text-sm border-b border-white/10 shrink-0">
        Files
      </h2>
      <ul className="overflow-y-auto p-1">
        {files.sort().map(path => (
          <li key={path}>
            <button
              onClick={() => onSelectFile(path)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs truncate ${
                activeFile === path
                  ? 'bg-blue-600/50 text-white'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {path}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileExplorer;
