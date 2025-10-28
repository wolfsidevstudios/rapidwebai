// FIX: Add type declaration for window.Babel, which is loaded via a script tag.
declare global {
  interface Window {
    Babel: any;
  }
}

import React, { useState, useEffect, useRef } from 'react';
import type { ConsoleMessage } from './EditorPreviewPanel';

interface PreviewProps {
  code: string;
  onConsoleMessage: (message: ConsoleMessage) => void;
  clearConsole: () => void;
}

const Preview: React.FC<PreviewProps> = ({ code, onConsoleMessage, clearConsole }) => {
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState<string | null>(null);
  const [transpiledCode, setTranspiledCode] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const transpile = async () => {
      try {
        if (!window.Babel) {
          setStatus('initializing');
          return;
        }
        setStatus('transpiling');
        clearConsole();

        const result = await window.Babel.transform(code, {
          presets: ['react', 'typescript'],
          filename: 'App.tsx',
          sourceMaps: 'inline',
        }).code;
        
        setTranspiledCode(result || '');
        setError(null);
        setStatus('ready');
      } catch (err: any) {
        setError(err.message);
        setStatus('error');
        onConsoleMessage({ type: 'error', message: err.message, timestamp: new Date() });
      }
    };
    transpile();
  }, [code, clearConsole, onConsoleMessage]);
  
  // Set up console message listener for the iframe.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const { type, level, message } = event.data;
      if (type === 'console') {
        onConsoleMessage({ type: level, message, timestamp: new Date() });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConsoleMessage]);
  
  // Use a backtick-friendly escape function for the code string
  const escapeCode = (codeStr: string) => {
    return codeStr.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  };
  
  const srcDoc = `
    <html>
      <head>
        <style>
          body { margin: 0; background-color: white; color: black; }
          #root { height: 100%; width: 100%; }
          .runtime-error-overlay {
            position: fixed; inset: 0; background-color: rgba(26, 26, 26, 0.95);
            color: #ff5555; font-family: 'SF Mono', Consolas, Menlo, monospace;
            padding: 2rem; overflow: auto; line-height: 1.6; white-space: pre-wrap;
          }
          .runtime-error-overlay h3 {
            font-size: 1.25rem; margin-bottom: 1rem;
            font-family: system-ui, sans-serif; color: #ff8080;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script>
          // --- Console Interceptor ---
          const originalConsole = { ...window.console };
          const formatArgs = (args) => args.map(arg => arg instanceof Error ? arg.stack || arg.message : typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
          Object.keys(originalConsole).forEach(key => {
            if (typeof originalConsole[key] === 'function') {
              window.console[key] = (...args) => {
                window.parent.postMessage({ type: 'console', level: key, message: formatArgs(args) }, '*');
                originalConsole[key](...args);
              };
            }
          });

          // --- Error Handling ---
          const handleError = (error) => {
            console.error(error);
            document.body.innerHTML = '<div class="runtime-error-overlay"><h3>Runtime Error</h3>' + (error.stack || error.message) + '</div>';
          };
          
          window.addEventListener('error', (event) => { event.preventDefault(); handleError(event.error); });
          window.addEventListener('unhandledrejection', (event) => { event.preventDefault(); handleError(event.reason); });

          // --- Code Execution ---
          try {
            const codeToRun = \`${escapeCode(transpiledCode)}\`;
            if (codeToRun.trim()) {
                const require = (name) => {
                    if (name === 'react') return window.React;
                    throw new Error(\`Cannot find module '\${name}'\`);
                };
                const exports = {};
                const module = { exports };
                
                (function(module, exports, require) {
                  ${transpiledCode}
                })(module, exports, require);

                const App = module.exports.default;
                if (typeof App !== 'function') {
                    throw new Error("The code must export a default React component.");
                }
                const root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(React.createElement(App));
            }
          } catch (error) {
            handleError(error);
          }
        </script>
      </body>
    </html>
  `;

  if (status === 'error') {
    return (
      <div className="p-4 m-4 bg-red-100 border-l-4 border-red-500 text-red-800 font-mono">
        <h3 className="font-bold font-sans mb-2">Transpilation Error</h3>
        <pre className="whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  if (status !== 'ready') {
    return <div className="flex items-center justify-center h-full text-gray-500">{status === 'initializing' ? 'Initializing transpiler...' : 'Transpiling code...'}</div>;
  }

  return (
    <iframe
      ref={iframeRef}
      title="Application Preview"
      srcDoc={srcDoc}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-modals allow-forms"
    />
  );
};

export default Preview;