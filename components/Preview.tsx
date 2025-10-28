import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ConsoleMessage } from './EditorPreviewPanel';

// @ts-ignore - esbuild is loaded from a script tag in index.html
const esbuild = window.esbuild;

interface PreviewProps {
  files: Record<string, string>;
  onConsoleMessage: (message: ConsoleMessage) => void;
  clearConsole: () => void;
}

const Preview: React.FC<PreviewProps> = ({ files, onConsoleMessage, clearConsole }) => {
  const [bundledCode, setBundledCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEsbuildInitialized, setIsEsbuildInitialized] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const initializeEsbuild = async () => {
      if (isEsbuildInitialized || !esbuild) return;
      try {
        await esbuild.initialize({
          wasmURL: 'https://unpkg.com/esbuild-wasm@0.21.4/esbuild.wasm',
          worker: true,
        });
        setIsEsbuildInitialized(true);
      } catch (e) {
        console.error("Failed to initialize esbuild", e);
        setError("Failed to initialize code bundler. Please refresh the page.");
      }
    };
    initializeEsbuild();
  }, [isEsbuildInitialized]);
  
  const fetchPlugin = {
    name: 'fetch-plugin',
    setup(build: any) {
        // Cache for fetched packages
        const packageCache: Record<string, { url: string, content: string }> = {};

        // Handle bare imports (npm packages)
        build.onResolve({ filter: /^[^./]/ }, async (args: any) => {
            const res = await fetch(`https://unpkg.com/${args.path}?meta`);
            const url = res.url.replace('?meta', '');
            return { path: url, namespace: 'http-url' };
        });
        
        // Handle relative imports from fetched packages
        build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args: any) => {
            return {
                path: new URL(args.path, args.importer).href,
                namespace: 'http-url',
            };
        });
        
        // Load fetched packages from cache or network
        build.onLoad({ filter: /.*/, namespace: 'http-url' }, async (args: any) => {
            if (packageCache[args.path]) {
                return { contents: packageCache[args.path].content };
            }
            const res = await fetch(args.path);
            const content = await res.text();
            packageCache[args.path] = { url: args.path, content };
            return { contents: content };
        });
    },
  };

  const bundleProject = useCallback(async (projectFiles: Record<string, string>) => {
    if (!isEsbuildInitialized) return;
    clearConsole();
    setError(null);
    setBundledCode(null);

    try {
      const result = await esbuild.build({
        entryPoints: ['src/main.jsx'],
        bundle: true,
        write: false,
        plugins: [{
          name: 'in-memory-file-loader',
          setup(build: any) {
            build.onResolve({ filter: /.*/ }, (args: any) => {
              if (args.path === 'src/main.jsx') return { path: 'src/main.jsx', namespace: 'in-memory' };
              if (args.path.startsWith('./') || args.path.startsWith('../')) {
                const path = new URL(args.path, 'file://' + args.resolveDir + '/').pathname.substring(1);
                 const potentialPaths = [ path, `${path}.js`, `${path}.jsx`, `${path}.ts`, `${path}.tsx`, `${path}.css`, `${path}/index.js`, `${path}/index.jsx`, `${path}/index.ts`, `${path}/index.tsx` ];
                for (const p of potentialPaths) {
                    if (projectFiles[p]) return { path: p, namespace: 'in-memory' };
                }
              }
              return { path: args.path, namespace: 'npm' };
            });
            build.onLoad({ filter: /.*/, namespace: 'in-memory' }, (args: any) => {
                const fileContent = projectFiles[args.path];
                if (fileContent === undefined) return { errors: [{ text: `File not found: ${args.path}` }] };
                const loader = args.path.endsWith('.css') ? 'css' : 'jsx';
                return { contents: fileContent, loader, resolveDir: args.path.substring(0, args.path.lastIndexOf('/')) };
            });
          }
        },
        fetchPlugin,
        ],
        define: { 'process.env.NODE_ENV': '"production"' },
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
      });
      setBundledCode(result.outputFiles[0].text);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred during bundling.';
      setError(errorMessage.split('\n').slice(0, 10).join('\n'));
      setBundledCode(null);
      onConsoleMessage({ type: 'error', message: errorMessage, timestamp: new Date() });
    }
  }, [isEsbuildInitialized, onConsoleMessage, clearConsole]);
  

  useEffect(() => {
    if (files && isEsbuildInitialized) {
      bundleProject(files);
    }
  }, [files, bundleProject, isEsbuildInitialized]);

  const html = files['public/index.html'];

  if (!html) {
    return <div className="p-4 m-4 bg-red-100 text-red-800">Error: public/index.html not found.</div>;
  }
  
  if (error) {
     return (
        <div className="p-4 m-4 bg-red-100 border-l-4 border-red-500 text-red-800 font-mono">
            <h3 className="font-bold font-sans mb-2">Bundler Error</h3>
            <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      );
  }
  
  if (!bundledCode) {
    return <div className="flex items-center justify-center h-full text-gray-500">Bundling project...</div>;
  }

  const srcDoc = html.replace(
    '<script type="module" src="../src/main.jsx"></script>',
    `
    <style>
      body { margin: 0; }
      .runtime-error-overlay {
        position: fixed;
        inset: 0;
        background-color: rgba(26, 26, 26, 0.95);
        color: #ff5555;
        font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        overflow: auto;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      .runtime-error-overlay h3 {
        font-size: 1.25rem;
        margin-bottom: 1rem;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        color: #ff8080;
      }
    </style>
    <script>
      // --- Console Interceptor ---
      const originalConsole = { ...window.console };
      const formatArgs = (args) => {
        return args.map(arg => {
          if (arg instanceof Error) { return arg.stack || arg.message; }
          if (typeof arg === 'object' && arg !== null) {
            try { return JSON.stringify(arg, null, 2); } catch (e) { return '[Unserializable Object]'; }
          }
          return String(arg);
        }).join(' ');
      };
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
        console.error(error); // Log to our intercepted console
        document.body.innerHTML = ''; // Clear the page
        const errorDiv = document.createElement('div');
        errorDiv.className = 'runtime-error-overlay';
        errorDiv.innerHTML = '<h3>Runtime Error</h3>' + (error.stack || error.message);
        document.body.appendChild(errorDiv);
      };
      
      window.addEventListener('error', (event) => { 
        event.preventDefault(); 
        handleError(event.error); 
      });

      try {
        ${bundledCode}
      } catch (err) {
        handleError(err);
      }
    </script>
    `
  );

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.source !== iframeRef.current?.contentWindow) return;
            const { type, level, message } = event.data;
            if (type === 'console') {
                onConsoleMessage({ type: level, message, timestamp: new Date() });
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onConsoleMessage]);


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
