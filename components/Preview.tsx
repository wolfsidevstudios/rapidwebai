import React, { useEffect, useRef } from 'react';
import type { ConsoleMessage } from './EditorPreviewPanel';

interface PreviewProps {
  code: string;
  onConsoleMessage: (message: ConsoleMessage) => void;
  clearConsole: () => void;
}

const Preview: React.FC<PreviewProps> = ({ code, onConsoleMessage, clearConsole }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // When new code arrives, the iframe will be reloaded, so we clear the old console messages.
  useEffect(() => {
    clearConsole();
  }, [code, clearConsole]);
  
  // Set up a listener to receive console messages from the iframe.
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
  
  // We need to escape closing script tags to prevent the HTML from breaking.
  const escapeForScriptTag = (codeStr: string) => {
      return codeStr.replace(/<\/script>/g, '<\\/script>');
  };

  // The entire sandbox environment is defined in this HTML string.
  // It now includes Babel and performs transpilation right before execution.
  const srcDoc = `
    <html>
      <head>
        <style>
          body { margin: 0; background-color: white; color: black; font-family: sans-serif; }
          #root { height: 100%; width: 100%; }
          .runtime-error-overlay {
            position: fixed; inset: 0; background-color: rgba(26, 26, 26, 0.95);
            color: #ff5555; font-family: 'SF Mono', Consolas, Menlo, monospace;
            padding: 2rem; overflow: auto; line-height: 1.6; white-space: pre-wrap; z-index: 9999;
          }
          .runtime-error-overlay h3 {
            font-size: 1.25rem; margin-bottom: 1rem;
            font-family: system-ui, sans-serif; color: #ff8080;
          }
        </style>
        <!-- 1. Load Babel for in-iframe transpilation -->
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
      </head>
      <body>
        <div id="root"></div>
        
        <!-- 2. The user's raw TSX code is placed here -->
        <script type="text/babel" data-type="module" id="user-code">
          ${escapeForScriptTag(code)}
        <\/script>
        
        <!-- 3. Our script transpiles and runs the user's code -->
        <script type="module">
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
            const errorOverlay = document.createElement('div');
            errorOverlay.className = 'runtime-error-overlay';
            errorOverlay.innerHTML = '<h3>Error</h3>' + (error.stack || error.message || 'An unknown error occurred.');
            // Clear previous content and show the error
            document.body.innerHTML = ''; 
            document.body.appendChild(errorOverlay);
          };
          
          window.addEventListener('error', (event) => { event.preventDefault(); handleError(event.error); });
          window.addEventListener('unhandledrejection', (event) => { event.preventDefault(); handleError(event.reason); });

          // --- Code Execution ---
          try {
            const userCodeEl = document.getElementById('user-code');
            const rawCode = userCodeEl.textContent;
            
            if (!rawCode.trim()) return;

            // Use Babel to transpile the code on the fly
            const transpiledCode = Babel.transform(rawCode, {
              presets: ['react', 'typescript'],
              filename: 'App.tsx'
            }).code;

            // IMPORTANT: An import map in the document does not apply to modules loaded via blob URLs.
            // We must replace bare module specifiers with full CDN URLs to ensure they resolve correctly.
            const codeWithAbsoluteImports = (transpiledCode || '')
              .replace(/from\s+['"]react['"]/g, 'from "https://esm.run/react@18"')
              .replace(/from\s+['"]react-dom\/client['"]/g, 'from "https://esm.run/react-dom@18/client"');

            // Use a blob URL to import the transpiled code as an ES module
            const blob = new Blob([codeWithAbsoluteImports], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            
            import(url).then(async (module) => {
              URL.revokeObjectURL(url); // Clean up
              const App = module.default;

              if (typeof App !== 'function') {
                  throw new Error("The code must export a default React component.");
              }
              
              // Import React/ReactDOM from absolute URLs as well for robustness
              const React = await import('https://esm.run/react@18');
              const { createRoot } = await import('https://esm.run/react-dom@18/client');
              const root = createRoot(document.getElementById('root'));
              root.render(React.createElement(App));
            }).catch(handleError);

          } catch (error) {
            handleError(error);
          }
        <\/script>
      </body>
    </html>
  `;
  
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