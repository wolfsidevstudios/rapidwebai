
import React, { useEffect, useRef } from 'react';
import type { ConsoleMessage } from './EditorPreviewPanel';

interface PreviewProps {
  code: string;
  onConsoleMessage: (message: ConsoleMessage) => void;
  clearConsole: () => void;
}

const Preview: React.FC<PreviewProps> = ({ code, onConsoleMessage, clearConsole }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // When new code arrives, clear the old console messages as the iframe will reload.
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
  
  // Safely escape the code to be injected into a JavaScript template literal inside the HTML.
  const escapeCodeForTemplateLiteral = (codeStr: string) => {
      return codeStr.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
  };

  // The entire sandbox environment is defined in this HTML string.
  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; font-family: sans-serif; background-color: white; color: black; }
          #root { height: 100vh; width: 100vw; }
          .error-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            box-sizing: border-box;
            background-color: #1a1a1a;
            color: #ff5555;
            font-family: 'SF Mono', Consolas, Menlo, monospace;
            padding: 2rem;
            overflow: auto;
            white-space: pre-wrap;
            z-index: 9999;
          }
          .error-overlay h3 {
            font-size: 1.25rem; margin-top: 0; margin-bottom: 1rem;
            font-family: system-ui, sans-serif; color: #ff8080;
          }
        </style>
        <!-- Babel for TSX transpilation -->
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
        
        <!-- Import Map to handle bare module specifiers -->
        <script type="importmap">
        {
          "imports": {
            "react": "https://esm.sh/react@18.2.0",
            "react-dom": "https://esm.sh/react-dom@18.2.0",
            "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
            "react/jsx-runtime": "https://esm.sh/react@18.2.0/jsx-runtime",
            "framer-motion": "https://esm.sh/framer-motion@11.2.12",
            "d3": "https://esm.sh/d3@7.9.0",
            "chart.js": "https://esm.sh/chart.js@4.4.3",
            "react-chartjs-2": "https://esm.sh/react-chartjs-2@5.2.0",
            "axios": "https://esm.sh/axios@1.7.2",
            "clsx": "https://esm.sh/clsx@2.1.1",
            "lodash": "https://esm.sh/lodash@4.17.21",
            "date-fns": "https://esm.sh/date-fns@3.6.0",
            "canvas-confetti": "https://esm.sh/canvas-confetti@1.9.3"
          }
        }
        <\/script>
      </head>
      <body>
        <div id="root"></div>

        <script type="module">
            // --- Console Interceptor ---
            const originalConsole = { ...console };
            const formatArgs = (args) => args.map(arg => {
                if (arg instanceof Error) return arg.stack || arg.message;
                try {
                    return typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg);
                } catch (e) {
                    return 'Unserializable object';
                }
            }).join(' ');
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
                console.error(error); // Log to parent console
                const root = document.getElementById('root');
                if (root) {
                    // Improve error message formatting
                    const errorStack = error.stack ? error.stack.replace(/blob:https?:\/\/[^/]+\//g, '') : error.message;
                    root.innerHTML = \`<div class="error-overlay"><h3>Runtime Error</h3><pre>\${errorStack}</pre></div>\`;
                }
            };
            
            window.addEventListener('error', (event) => { event.preventDefault(); handleError(event.error); });
            window.addEventListener('unhandledrejection', (event) => { event.preventDefault(); handleError(event.reason); });
            
            // --- ES Module based execution logic ---
            const renderApp = async () => {
              try {
                  const rawCode = \`${escapeCodeForTemplateLiteral(code)}\`;
                  if (!rawCode.trim()) return;

                  // Transpile TSX to ES Module JavaScript
                  const transpiledCode = Babel.transform(rawCode, {
                      presets: ['react', 'typescript'],
                      filename: 'App.tsx'
                  }).code;
                  
                  // Create a blob URL to import the code as a module
                  const blob = new Blob([transpiledCode], { type: 'text/javascript' });
                  const url = URL.createObjectURL(blob);
                  const { default: App } = await import(url);
                  URL.revokeObjectURL(url); // Clean up

                  // Import React and ReactDOM from the module context
                  const React = await import('react');
                  const ReactDOM = await import('react-dom/client');

                  if (typeof App !== 'function' && !(App && typeof App.render === 'function')) {
                      throw new Error("The code must export a default React component.");
                  }
                  
                  const root = ReactDOM.createRoot(document.getElementById('root'));
                  root.render(React.createElement(App));

              } catch (err) {
                  handleError(err);
              }
            };

            renderApp();
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
      sandbox="allow-scripts allow-modals allow-same-origin"
    />
  );
};

export default Preview;
