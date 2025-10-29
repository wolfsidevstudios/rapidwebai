import React, { useState, useEffect, useRef } from 'react';
import type { ConsoleMessage } from './EditorPreviewPanel';

// Ensure Babel is available on the window object
declare const Babel: any;

interface PreviewProps {
  code: string;
  onConsoleMessage: (message: ConsoleMessage) => void;
  clearConsole: () => void;
}

const Preview: React.FC<PreviewProps> = ({ code, onConsoleMessage, clearConsole }) => {
  const [srcDoc, setSrcDoc] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      clearConsole();
      if (!code.trim() || typeof Babel === 'undefined') {
        setSrcDoc('<html><body style="margin:0; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-family: sans-serif; color: #666;">Preview will appear here.</body></html>');
        return;
      }
      
      try {
        const transformedCode = Babel.transform(code, {
          presets: ['react', 'typescript'],
          filename: 'component.tsx', // Important for TSX parsing
        }).code;

        // Simple regex to find the main component name
        const componentNameMatch = code.match(/const\s+([A-Z][a-zA-Z0-9_]*)\s*[:=]/);
        const componentName = componentNameMatch ? componentNameMatch[1] : null;

        if (!componentName) {
            throw new Error("Could not find a component to render. Make sure you have a component exported (e.g., `const MyComponent = () => ...; export default MyComponent;`).");
        }

        const html = `
          <html>
            <head>
              <script src="https://cdn.tailwindcss.com"></script>
              <script>
                // This is a fix for TailwindCSS in an iframe.
                tailwind.config = {
                  theme: {
                    extend: {
                      // You can extend theme here if needed
                    }
                  }
                }
              </script>
              <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
              <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
              <style>
                body { margin: 0; }
              </style>
            </head>
            <body>
              <div id="app"></div>
              <script type="text/javascript">
                // Proxy console logs and errors back to the parent
                const handleError = (error, type) => {
                  const message = (error.stack || error.message);
                  window.parent.postMessage({ type: 'console', level: 'error', message: type + ': ' + message }, '*');
                };
                window.addEventListener('error', e => { e.preventDefault(); handleError(e.error, 'Runtime Error'); });
                window.addEventListener('unhandledrejection', e => { e.preventDefault(); handleError(e.reason, 'Promise Rejection'); });
                
                const originalConsole = { ...console };
                Object.keys(originalConsole).forEach(key => {
                  if (typeof originalConsole[key] === 'function') {
                    console[key] = (...args) => {
                      const formatted = args.map(arg => {
                        if (arg instanceof Error) return arg.stack || arg.message;
                        try { return typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg); }
                        catch (e) { return 'Unserializable object'; }
                      }).join(' ');
                      window.parent.postMessage({ type: 'console', level: key, message: formatted }, '*');
                      originalConsole[key](...args);
                    };
                  }
                });

                // Render the component
                try {
                  const React = window.React;
                  const ReactDOM = window.ReactDOM;
                  let exports = {};
                  ${transformedCode.replace(/export default/, 'exports.default =')}
                  const Component = exports.default || window.${componentName};
                  if (Component) {
                    const element = React.createElement(Component);
                    ReactDOM.createRoot(document.getElementById('app')).render(element);
                  } else {
                     throw new Error("Component '${componentName}' not found or not exported.");
                  }
                } catch (e) {
                  handleError(e, 'Render Error');
                }
              </script>
            </body>
          </html>
        `;
        setSrcDoc(html);

      } catch (err: any) {
        const errorMessage = (err.message || 'An error occurred during transpilation.').replace(/</g, '&lt;');
        onConsoleMessage({ type: 'error', message: `Babel Error: ${errorMessage}`, timestamp: new Date() });
        const errorHtml = `<div style="color: #c00; padding: 1rem; font-family: monospace; white-space: pre-wrap; background-color: #fff0f0;"><h3>Build Error</h3>${errorMessage}</div>`;
        setSrcDoc(`<html><body>${errorHtml}</body></html>`);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [code, clearConsole, onConsoleMessage]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const { type, level, message } = event.data;
      if (type === 'console') {
          onConsoleMessage({ type: level, message, timestamp: new Date() });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
        window.removeEventListener('message', handleMessage);
    };
  }, [onConsoleMessage]);

  return (
    <iframe
      ref={iframeRef}
      title="Application Preview"
      srcDoc={srcDoc}
      className="w-full h-full border-0 bg-white"
      sandbox="allow-scripts allow-modals allow-forms"
    />
  );
};

export default Preview;
