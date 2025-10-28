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
        <!-- Load UMD builds for React, ReactDOM, and Babel -->
        <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
      </head>
      <body>
        <div id="root"></div>

        <script type="text/javascript">
            // --- Console Interceptor ---
            const originalConsole = { ...window.console };
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
                    const errorStack = error.stack ? error.stack.replace(/<anonymous>:/g, 'App.tsx:') : error.message;
                    root.innerHTML = \`<div class="error-overlay"><h3>Runtime Error</h3><pre>\${errorStack}</pre></div>\`;
                }
            };
            
            window.addEventListener('error', (event) => { event.preventDefault(); handleError(event.error); });
            window.addEventListener('unhandledrejection', (event) => { event.preventDefault(); handleError(event.reason); });
            
            // --- Legacy require-based execution logic ---
            try {
                // This custom, limited 'require' function is the source of the original issue.
                const require = (path) => {
                    if (path === 'react') return window.React;
                    if (path === 'react-dom' || path === 'react-dom/client') return window.ReactDOM;
                    throw new Error(\`Cannot find module '\${path}'. Complex dependencies are not supported in this previewer.\`);
                };

                const exports = {};
                const module = { exports };
                const rawCode = \`${escapeCodeForTemplateLiteral(code)}\`;

                if (rawCode.trim()) {
                    // Transpile TSX to CommonJS-style JavaScript (using 'require').
                    const transpiledCode = Babel.transform(rawCode, {
                        presets: ['react', 'typescript'],
                        filename: 'App.tsx' // For better error messages
                    }).code;

                    // Evaluate the transpiled code within a scope where 'require', 'module', and 'exports' are defined.
                    eval(transpiledCode);

                    // The main component is expected to be the default export.
                    const App = module.exports.default;

                    if (typeof App !== 'function' && !(App && typeof App.render === 'function')) {
                        throw new Error("The code must export a default React component.");
                    }

                    // Render the final component into the 'root' div.
                    const root = ReactDOM.createRoot(document.getElementById('root'));
                    root.render(React.createElement(App));
                }

            } catch (err) {
                handleError(err);
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
      sandbox="allow-scripts allow-modals"
    />
  );
};

export default Preview;
