import React, { useState, useMemo } from 'react';

interface FileExplorerProps {
  files: Record<string, string>;
  activeFile: string;
  onFileSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  path?: string;
  children?: Record<string, TreeNode>;
}

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

const FolderOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
    </svg>
);
const FolderClosedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);


const buildFileTree = (filePaths: string[]): TreeNode => {
  const root: TreeNode = { name: 'root', children: {} };
  filePaths.forEach(path => {
    let currentNode = root;
    path.split('/').forEach((part, index, arr) => {
      if (!currentNode.children) currentNode.children = {};
      if (!currentNode.children[part]) {
        currentNode.children[part] = { name: part };
      }
      if (index === arr.length - 1) {
        currentNode.children[part].path = path;
      }
      currentNode = currentNode.children[part];
    });
  });
  return root;
};

const Node: React.FC<{ node: TreeNode; onFileSelect: (path: string) => void; activeFile: string; }> = ({ node, onFileSelect, activeFile }) => {
    const [isOpen, setIsOpen] = useState(true);
    const isFolder = node.children && Object.keys(node.children).length > 0;
  
    if (isFolder) {
      return (
        <div>
          <div onClick={() => setIsOpen(!isOpen)} className="flex items-center cursor-pointer py-1 px-2 rounded hover:bg-white/10">
            {isOpen ? <FolderOpenIcon /> : <FolderClosedIcon />}
            <span className="text-gray-300 text-sm">{node.name}</span>
          </div>
          {isOpen && (
            <div className="pl-4 border-l border-gray-700 ml-2">
              {/* FIX: Cast Object.values to TreeNode[] to ensure correct type inference for sort arguments. */}
              {(Object.values(node.children!) as TreeNode[])
                .sort((a, b) => (a.children && !b.children) ? -1 : (!a.children && b.children) ? 1 : a.name.localeCompare(b.name))
                .map(child => <Node key={child.name} node={child} onFileSelect={onFileSelect} activeFile={activeFile} />)
              }
            </div>
          )}
        </div>
      );
    }
  
    // It's a file
    const isSelected = activeFile === node.path;
    return (
      <div
        onClick={() => onFileSelect(node.path!)}
        className={`flex items-center cursor-pointer py-1 px-2 rounded ${isSelected ? 'bg-blue-600/30' : 'hover:bg-white/10'}`}
      >
        <FileIcon />
        <span className={`text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>{node.name}</span>
      </div>
    );
};
  

const FileExplorer: React.FC<FileExplorerProps> = ({ files, activeFile, onFileSelect }) => {
  const fileTree = useMemo(() => buildFileTree(Object.keys(files)), [files]);
  
  return (
    <div className="h-full w-full bg-[#1e1e1e] p-2 overflow-y-auto">
       <div className="text-gray-500 text-xs font-bold uppercase tracking-wider px-2 mb-2">
            Files
       </div>
      {fileTree.children && (Object.values(fileTree.children) as TreeNode[])
        // FIX: Cast Object.values to TreeNode[] to ensure correct type inference for sort arguments.
        .sort((a, b) => (a.children && !b.children) ? -1 : (!a.children && b.children) ? 1 : a.name.localeCompare(b.name))
        .map(node => <Node key={node.name} node={node} onFileSelect={onFileSelect} activeFile={activeFile} />)}
    </div>
  );
};

export default FileExplorer;