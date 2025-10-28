import React, { useState, useEffect, useRef } from 'react';
import type { ConsoleMessage } from './EditorPreviewPanel';

// The entire transpilation logic now lives inside this worker.
const workerCode = `
  // Load Babel Standalone into the worker's scope
  self.importScripts('https://unpkg.com/@babel/standalone/babel.min.js');

  // A helper function to resolve relative imports to absolute paths within our virtual file system.
  // This is crucial for building the import map correctly.
  const resolvePath = (path, importer, allFiles) => {
    // It's a package (e.g., 'react'), not a relative path, so we leave it alone.
    if (!path.startsWith('.')) { 
      return path; 
    }
    
    // Determine the directory of the file that is doing the import.
    const importerDir = importer.substring(0, importer.lastIndexOf('/'));
    
    // Create an absolute path from the root of our virtual filesystem.
    // We use the URL constructor for a robust way to handle '../' and './'.
    const resolved = new URL(path, 'file:///' + importerDir + '/').pathname.substring(1);
    
    // Check for various file extensions and index files, just like a real module resolver.
    const potentialPaths = [
      resolved,
      resolved + '.js', resolved + '.jsx', resolved + '.ts', resolved + '.tsx',
      resolved + '/index.js', resolved + '/index.jsx', resolved + '/index.ts', resolved + '/index.tsx'
    ];
    
    for (const p of potentialPaths) {
      if (allFiles[p] !== undefined) {
        // Return the resolved absolute path, ensuring it has a '.js' extension for transpiled files.
        return '/' + p.replace(/\\.(tsx|jsx|ts)$/, '.js');
      }
    }
    
    // If we can't find the file, we'll let the transpilation fail with a clear error.
    return path;
  };

  self.onmessage = (event) => {
    const { files } = event.data;
    try {
      const transpiledFiles = {};
      
      for (const filename in files) {
        const fileContent = files[filename];

        // Pass CSS files through without transpilation.
        if (filename.endsWith('.css')) {
          transpiledFiles[filename] = fileContent;
          continue;
        }

        // Transpile JS/TS/JSX/TSX files.
        if (/\.(js|jsx|ts|tsx)$/.test(filename)) {
          // 1. Rewrite relative imports to be absolute from the root.
          const codeWithAbsoluteImports = fileContent.replace(/from\\s+['"](.*?)['"]/g, (match, path) => {
            const resolved = resolvePath(path, filename, files);
            return \`from "\${resolved}"\`;
          });

          // 2. Transpile the code from TSX/JSX to browser-compatible JavaScript.
          const result = self.Babel.transform(codeWithAbsoluteImports, {
            presets: ['react', 'typescript'],
            filename: filename,
            sourceMaps: 'inline', // Add source maps for better debugging
          }).code;
          
          // 3. Rename the output file to have a .js extension.
          const newFilename = filename.replace(/\.(tsx|jsx|ts)$/, '.js');
          transpiledFiles[newFilename] = result;
        }
      }
      // Send the completed files back to the main thread.
      self.postMessage({ type: 'success', files: transpiledFiles });
    } catch (error) {
      // If Babel fails, send a detailed error message back.
      self.postMessage({ type: 'error', error: error.message });
    }
  };
`;

interface PreviewProps {
  files: Record<string, string>;
  onConsoleMessage: (message: ConsoleMessage) => void;
  clearConsole: () => void;
}

const Preview: React.FC<PreviewProps> = ({ files, onConsoleMessage, clearConsole }) => {
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState<string | null>(null);
  const [srcDoc, setSrcDoc] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  // Initialize the Web Worker on component mount.
  useEffect(() => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { type, files: transpiledFiles, error: transpileError } = event.data;

      // Clean up old blob URLs to prevent memory leaks.
      blobUrlsRef.current.forEach(URL.revokeObjectURL);
      blobUrlsRef.current = [];

      if (type === 'error') {
        setError(transpileError);
        setStatus('error');
        onConsoleMessage({ type: 'error', message: transpileError, timestamp: new Date() });
        return;
      }
      
      const htmlFile = files['public/index.html'];
      if (!htmlFile) {
        setError('Error: public/index.html not found.');
        setStatus('error');
        return;
      }

      const blobUrls: Record<string, string> = {};
      const cssLinks: string[] = [];
      const importMap: { imports: Record<string, string> } = {
        imports: {
          'react': 'https://unpkg.com/react@18/umd/react.development.js',
          'react-dom': 'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
          'react-dom/client': 'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
        },
      };

      for (const filename in transpiledFiles) {
        const content = transpiledFiles[filename];
        const mimeType = filename.endsWith('.css') ? 'text/css' : 'application/javascript';
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        blobUrls[filename] = url;
        blobUrlsRef.current.push(url);

        if (filename.endsWith('.css')) {
          cssLinks.push(`<link rel="stylesheet" href="${url}">`);
        } else if (filename.endsWith('.js')) {
          importMap.imports['/' + filename] = url;
        }
      }

      // The entry point for the browser's module loader.
      const entryPoint = Object.keys(files).find(f => f.includes('main.jsx') || f.includes('main.tsx'));
      if (!entryPoint) {
         setError('Error: No entry point (src/main.jsx or src/main.tsx) found.');
         setStatus('error');
         return;
      }
      const entryPointJs = '/' + entryPoint.replace(/\.(tsx|jsx)$/, '.js');

      const finalHtml = htmlFile
        .replace('</head>', `${cssLinks.join('\n')}</head>`)
        .replace(
          /<script type="module".*?><\/script>/,
          `
          <script type="importmap">${JSON.stringify(importMap)}</script>
          <script type="module" src="${entryPointJs}"></script>
          `
        );
      
      setSrcDoc(finalHtml);
      setStatus('ready');
      setError(null);
    };

    return () => {
      worker.terminate();
      blobUrlsRef.current.forEach(URL.revokeObjectURL);
    };
  }, []); // Run only once

  // When project files change, send them to the worker for transpilation.
  useEffect(() => {
    if (Object.keys(files).length > 0 && workerRef.current) {
      setStatus('transpiling');
      clearConsole();
      workerRef.current.postMessage({ files });
    }
  }, [files, clearConsole]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

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
  
  const iframeContent = `
    <html>
      <head>
        <style>
          body { margin: 0; }
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
        ${srcDoc.replace('</body>', `
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
          </script>
        </body>
        `)}
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
      srcDoc={iframeContent}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-modals allow-forms"
    />
  );
};

export default Preview;
