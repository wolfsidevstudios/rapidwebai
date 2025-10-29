import React, { useState, useEffect, useRef } from 'react';
import type { ConsoleMessage } from './EditorPreviewPanel';

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
      try {
        if (!code.trim()) {
          setSrcDoc('<html><body style="margin:0;"></body></html>');
          return;
        }

        const transpiledCode = Babel.transform(code, {
          presets: [
            ['react', { runtime: 'classic' }],
            ['typescript', { isTSX: true, allExtensions: true }]
          ],
          filename: 'App.tsx'
        }).code;

        const htmlContent = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <script src="https://cdn.tailwindcss.com"></script>
              <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
              <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
              <style>body { margin: 0; background-color: white; }</style>
            </head>
            <body>
              <div id="root"></div>
              <script type="text/javascript">
                const handleError = (error, type) => {
                  const message = (error.stack || error.message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                  document.body.innerHTML = \`<div style="color: #c00; padding: 1rem; font-family: monospace; white-space: pre-wrap; background-color: #fff0f0;"><h3>\${type}</h3>\${message}</div>\`;
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
                try {
                  const exports = {};
                  (function(exports, React) {
                    ${transpiledCode}
                  })(exports, window.React);
                  const App = exports.default;
                  if (!App || (typeof App !== 'function' && typeof App.render !== 'function')) {
                    throw new Error('A default export of a React component is required.');
                  }
                  const root = ReactDOM.createRoot(document.getElementById('root'));
                  root.render(React.createElement(App));
                } catch (err) {
                  handleError(err, 'Render Error');
                }
              </script>
            </body>
          </html>
        `;
        setSrcDoc(htmlContent);
      } catch (err) {
        const sanitizedMessage = String(err.message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const htmlContent = `
          <html>
            <body style="margin:0;">
              <div style="color: #c00; padding: 1rem; font-family: monospace; white-space: pre-wrap; background-color: #fff0f0;">
                <h3>Transpilation Error</h3>
                ${sanitizedMessage}
              </div>
            </body>
          </html>`;
        setSrcDoc(htmlContent);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [code, clearConsole]);

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
      sandbox="allow-scripts allow-modals"
    />
  );
};

export default Preview;
