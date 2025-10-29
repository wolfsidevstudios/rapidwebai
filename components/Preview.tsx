import React, { useState, useEffect, useRef } from 'react';
import type { ConsoleMessage } from './EditorPreviewPanel';

interface PreviewProps {
  files: { [key: string]: string };
  onConsoleMessage: (message: ConsoleMessage) => void;
  clearConsole: () => void;
}

const Preview: React.FC<PreviewProps> = ({ files, onConsoleMessage, clearConsole }) => {
  const [srcDoc, setSrcDoc] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      clearConsole();
      
      const baseHtml = files['index.html'] || '';
      const css = files['style.css'] || '';
      const js = files['script.js'] || '';
      
      if (!baseHtml.trim()) {
        setSrcDoc('<html><body style="margin:0; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-family: sans-serif; color: #666;">Preview will appear here.</body></html>');
        return;
      }

      // We need to inject our proxied console, then the user's script.
      const consoleProxyScript = `
        const handleError = (error, type) => {
          const message = (error.stack || error.message || String(error));
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
      `;

      try {
        let html = baseHtml;
        
        // Inject CSS into the head
        if (html.includes('</head>')) {
            html = html.replace('</head>', `<style>${css}</style></head>`);
        } else {
            html += `<style>${css}</style>`;
        }
        
        // Inject JS before the closing body tag
        const fullScript = `
          try {
            ${consoleProxyScript}
            ${js}
          } catch (e) {
            handleError(e, 'Script Execution Error');
          }
        `;
        
        if (html.includes('</body>')) {
            html = html.replace('</body>', `<script>${fullScript}</script></body>`);
        } else {
            html += `<script>${fullScript}</script>`;
        }
        
        setSrcDoc(html);

      } catch (err: any) {
        onConsoleMessage({ type: 'error', message: `Preview Error: ${err.message}`, timestamp: new Date() });
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [files, clearConsole, onConsoleMessage]);

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