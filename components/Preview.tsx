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

  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          /* --- Basic Reset & Theming --- */
          body { 
            margin: 0; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: white; 
            color: #1a1a1a;
            overflow: hidden; /* Prevent scrollbars from flickering during render */
          }
          #root { height: 100vh; width: 100vw; }

          /* --- Loading Indicator --- */
          .loader {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            width: 100vw;
            background-color: #f0f0f0;
          }
          .loader-dot {
            width: 10px;
            height: 10px;
            margin: 0 5px;
            background-color: #888;
            border-radius: 50%;
            display: inline-block;
            animation: pulse 1.4s infinite ease-in-out both;
          }
          .loader-dot:nth-child(1) { animation-delay: -0.32s; }
          .loader-dot:nth-child(2) { animation-delay: -0.16s; }
          @keyframes pulse {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1.0); }
          }

          /* --- Polished Error Overlay --- */
          .error-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            box-sizing: border-box;
            background-color: rgba(10, 20, 30, 0.95);
            backdrop-filter: blur(4px);
            color: #e8e8e8;
            font-family: 'SF Mono', Consolas, Menlo, monospace;
            padding: 2rem;
            overflow: auto;
            white-space: pre-wrap;
            z-index: 9999;
            display: none; /* Initially hidden */
          }
          .error-container { max-width: 800px; margin: 0 auto; }
          .error-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding-bottom: 1rem;
            margin-bottom: 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          }
          .error-header svg {
            width: 2.5rem;
            height: 2.5rem;
            flex-shrink: 0;
            color: #ff5555;
          }
          .error-header h3 {
            font-size: 1.5rem; 
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            color: #ff8080;
            font-weight: 600;
          }
          .error-message {
            font-size: 1rem;
            line-height: 1.6;
            background: rgba(0,0,0,0.3);
            padding: 1rem;
            border-radius: 8px;
            border-left: 4px solid #ff5555;
            color: #f1f1f1;
            white-space: pre-wrap;
            word-break: break-word;
          }
        </style>
        <!-- Babel for TSX transpilation -->
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
        
        <!-- Import Map for dependencies -->
        <script type="importmap">
        {
          "imports": {
            "react": "https://esm.sh/react@18.3.1",
            "react-dom": "https://esm.sh/react-dom@18.3.1",
            "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
            "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
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
        <div id="loader" class="loader">
            <div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div>
        </div>
        <div id="error-overlay" class="error-overlay">
          <div class="error-container">
            <div class="error-header">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <h3 id="error-title">Runtime Error</h3>
              </div>
            </div>
            <pre id="error-message" class="error-message"></pre>
          </div>
        </div>

        <script type="module">
            const ROOT_ID = 'root';
            const LOADER_ID = 'loader';
            const ERROR_OVERLAY_ID = 'error-overlay';
            const ERROR_TITLE_ID = 'error-title';
            const ERROR_MESSAGE_ID = 'error-message';

            // --- Main Execution ---
            (async function main() {
              setupConsoleInterceptor();
              setupGlobalErrorHandlers();
              await transpileAndRender();
            })();

            // --- Core Functions ---

            /**
             * Transpiles and renders the user's React code.
             */
            async function transpileAndRender() {
              const loader = document.getElementById(LOADER_ID);
              const rootEl = document.getElementById(ROOT_ID);
              const errorOverlay = document.getElementById(ERROR_OVERLAY_ID);

              // 1. Prepare UI for new render
              loader.style.display = 'flex';
              rootEl.innerHTML = ''; 
              errorOverlay.style.display = 'none';

              try {
                let rawCode = \`${escapeCodeForTemplateLiteral(code)}\`;
                if (!rawCode.trim()) {
                  loader.style.display = 'none';
                  return; // Don't render if code is empty
                }

                // 2. Pre-process code: Ensure React is imported for the classic runtime.
                if (!/import\\s+React/.test(rawCode)) {
                  rawCode = "import React from 'react';\\n" + rawCode;
                }

                // 3. Transpile TSX to ES Module JavaScript using Babel.
                const transpiledCode = Babel.transform(rawCode, {
                  presets: [
                    ['react', { runtime: 'classic' }], 
                    ['typescript', { isTSX: true, allExtensions: true }]
                  ],
                  filename: 'App.tsx' // For better error messages
                }).code;
                
                // 4. Import the transpiled code as a module using a Blob URL.
                const blob = new Blob([transpiledCode], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                const { default: App } = await import(url);
                URL.revokeObjectURL(url); // Clean up the Blob URL

                // 5. Validate the imported module.
                if (typeof App !== 'function' && !(App && typeof App.render === 'function')) {
                  throw new Error("The code must have a default export that is a React component.");
                }
                
                // 6. Render the React application.
                const React = await import('react');
                const ReactDOM = await import('react-dom/client');
                const root = ReactDOM.createRoot(rootEl);
                root.render(React.createElement(App));

              } catch (err) {
                const errorType = err.name === 'SyntaxError' ? 'Transpilation Error' : 'Runtime Error';
                displayError(err, errorType);
              } finally {
                // 7. Hide loader after rendering or error.
                loader.style.display = 'none';
              }
            }
            
            // --- Utility Functions ---

            /**
             * Sets up global error handlers to catch any uncaught exceptions.
             */
            function setupGlobalErrorHandlers() {
              window.addEventListener('error', (event) => { 
                event.preventDefault(); 
                displayError(event.error, 'Runtime Error'); 
              });
              window.addEventListener('unhandledrejection', (event) => { 
                event.preventDefault(); 
                displayError(event.reason, 'Unhandled Promise Rejection'); 
              });
            }

            /**
             * Intercepts console methods to forward logs to the parent window.
             */
            function setupConsoleInterceptor() {
              const originalConsole = { ...console };
              const formatArgs = (args) => args.map(arg => {
                if (arg instanceof Error) return arg.stack || arg.message;
                try {
                  return typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg);
                } catch (e) { return 'Unserializable object'; }
              }).join(' ');

              Object.keys(originalConsole).forEach(key => {
                if (typeof originalConsole[key] === 'function') {
                  console[key] = (...args) => {
                    window.parent.postMessage({ type: 'console', level: key, message: formatArgs(args) }, '*');
                    originalConsole[key](...args);
                  };
                }
              });
            }

            /**
             * Displays a formatted error in the overlay.
             * @param {Error} error - The error object.
             * @param {string} type - The type of error (e.g., 'Runtime Error').
             */
            function displayError(error, type) {
              const errorOverlay = document.getElementById(ERROR_OVERLAY_ID);
              const errorTitle = document.getElementById(ERROR_TITLE_ID);
              const errorMessage = document.getElementById(ERROR_MESSAGE_ID);
              
              const cleanStack = (error.stack || '')
                .replace(/blob:https?:\\/\\/[^/]+/g, '') // Remove blob URL prefixes
                .replace(/\\?t=\\d+/g, ''); // Remove cache-busting query params

              errorTitle.textContent = type;
              errorMessage.textContent = error.message + '\\n\\n' + cleanStack;
              errorOverlay.style.display = 'block';
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
      className="w-full h-full border-0 bg-gray-100"
      sandbox="allow-scripts allow-modals allow-same-origin"
    />
  );
};

export default Preview;