import React, { useState, useEffect } from 'react';

interface PublishModalProps {
  projectId: string;
  onClose: () => void;
}

const PublishModal: React.FC<PublishModalProps> = ({ projectId, onClose }) => {
  const [copyStatus, setCopyStatus] = useState('Copy');
  const publishUrl = `${window.location.origin}/app/preview/${projectId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publishUrl)
      .then(() => {
        setCopyStatus('Copied!');
        setTimeout(() => setCopyStatus('Copy'), 2000);
      })
      .catch(err => console.error('Failed to copy text: ', err));
  };

  // Close modal on escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-white text-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-8 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">Share Your Project</h2>
        <p className="text-gray-600 mb-6">
          Anyone with this link can view your project.
        </p>
        <div className="flex items-center space-x-2 bg-gray-100 p-3 rounded-lg border border-gray-200">
          <input
            type="text"
            value={publishUrl}
            readOnly
            className="w-full bg-transparent outline-none text-gray-700"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors w-24"
          >
            {copyStatus}
          </button>
        </div>
        <div className="text-right mt-6">
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-black">Done</button>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;