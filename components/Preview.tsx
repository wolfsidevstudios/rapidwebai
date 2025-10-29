import React, { useState, useEffect, useRef } from 'react';
import type { ConsoleMessage } from './EditorPreviewPanel';

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
      if (!code.trim()) {
        setSrcDoc('<html><body style="margin:0;"></body></html>');
        return;
      }

      // This script will be injected into the user's HTML to capture console logs and errors.
      const proxyScript = `
        <script type="text/javascript">
            const handleError = (error, type) => {
              const message = (error.stack || error.message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
              // Avoid wiping the body if it's already an error message, which can cause loops.
              if (!document.body.querySelector('.runtime-error-display')) {
                document.body.innerHTML = \`<div class="runtime-error-display" style="color: #c00; padding: 1rem; font-family: monospace; white-space: pre-wrap; background-color: #fff0f0;"><h3>\${type}</h3>\${message}</div>\`;
              }
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
        </script>
      `;

      // Inject the script just before the closing </head> tag for best practice.
      let finalHtml = code;
      const headEndIndex = finalHtml.toLowerCase().indexOf('</head>');
      if (headEndIndex !== -1) {
          finalHtml = finalHtml.slice(0, headEndIndex) + proxyScript + finalHtml.slice(headEndIndex);
      } else {
          // As a fallback, inject before </body> if <head> is missing.
          const bodyEndIndex = finalHtml.toLowerCase().indexOf('</body>');
          if (bodyEndIndex !== -1) {
              finalHtml = finalHtml.slice(0, bodyEndIndex) + proxyScript + finalHtml.slice(bodyEndIndex);
          }
      }
      
      setSrcDoc(finalHtml);

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
      sandbox="allow-scripts allow-modals allow-forms"
    />
  );
};

export default Preview;
