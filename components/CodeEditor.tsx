
import React from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-full p-4 bg-[#1e1e1e] text-gray-200 font-mono text-sm outline-none resize-none"
      spellCheck="false"
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
    />
  );
};

export default CodeEditor;
