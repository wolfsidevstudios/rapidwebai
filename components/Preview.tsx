import React from 'react';

interface PreviewProps {
  files: Record<string, string>;
  bundledCode: string | null;
}

const Preview: React.FC<PreviewProps> = ({ files, bundledCode }) => {
  const html = files['public/index.html'];

  if (!html) {
    return <div className="p-4 m-4 bg-red-100 text-red-800">Error: public/index.html not found in project files.</div>;
  }
  
  if (!bundledCode) {
    return (
        <div className="flex items-center justify-center h-full text-gray-500">
            Bundling project...
        </div>
    );
  }

  // Inject the bundled code and a robust error-handling script into the base HTML file.
  const srcDoc = html.replace(
    '<script type="module" src="../src/main.jsx"></script>',
    `
    <style>
      /* Basic reset and styles for runtime errors to ensure they are visible */
      body { margin: 0; font-family: sans-serif; }
      .runtime-error-display {
        padding: 1.5rem;
        margin: 1rem;
        background-color: #fff5f5;
        border-left: 4px solid #f56565;
        color: #c53030;
        font-family: monospace;
      }
      .runtime-error-display h3 { margin-top: 0; font-weight: bold; font-family: sans-serif; }
      .runtime-error-display pre { 
        white-space: pre-wrap; 
        word-break: break-all;
        background-color: #fed7d7;
        padding: 0.5rem;
        border-radius: 4px;
        color: #7f1d1d;
      }
    </style>
    <script>
      // Catch both runtime errors and unhandled promise rejections
      const handleError = (error) => {
        const message = error.message || 'An unknown error occurred.';
        document.body.innerHTML = '<div class="runtime-error-display"><h3>Runtime Error</h3><pre>' + message + '</pre></div>';
        console.error(error);
      };

      window.addEventListener('error', (event) => {
        event.preventDefault();
        handleError(event.error);
      });

      window.addEventListener('unhandledrejection', (event) => {
        event.preventDefault();
        handleError(event.reason);
      });

      // Execute the bundled code inside a try-catch block
      try {
        ${bundledCode}
      } catch (err) {
        handleError(err);
      }
    </script>
    `
  );

  return (
    <iframe
      title="Application Preview"
      srcDoc={srcDoc}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-modals allow-forms"
    />
  );
};

export default Preview;
