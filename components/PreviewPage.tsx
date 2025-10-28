import React, { useState, useEffect, useCallback, useRef } from 'react';
import Preview from './Preview';
import type { Project } from '../App';

// @ts-ignore - esbuild is loaded from a script tag in index.html
const esbuild = window.esbuild;

interface PreviewPageProps {
    project: Project;
}

const PreviewPage: React.FC<PreviewPageProps> = ({ project }) => {
    const [bundledCode, setBundledCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const esbuildInitialized = useRef(false);

    const initializeEsbuild = async () => {
        if (esbuildInitialized.current || !esbuild) return;
        try {
            await esbuild.initialize({
                wasmURL: 'https://unpkg.com/esbuild-wasm@0.21.4/esbuild.wasm',
                worker: true,
            });
            esbuildInitialized.current = true;
        } catch(e) {
            console.error("Failed to initialize esbuild", e);
        }
    };

    useEffect(() => {
        initializeEsbuild();
    }, []);

    const bundleProject = useCallback(async (projectFiles: Record<string, string>) => {
        if (!esbuildInitialized.current) {
            setError('Waiting for bundler to initialize...');
            setTimeout(() => bundleProject(projectFiles), 1000); // Retry after a second
            return;
        }
        setError(null);

        try {
            const result = await esbuild.build({
                entryPoints: ['src/main.jsx'],
                bundle: true,
                write: false,
                plugins: [{
                    name: 'in-memory-file-loader',
                    setup(build: any) {
                        build.onResolve({ filter: /.*/ }, (args: any) => {
                             if (args.path === 'src/main.jsx') {
                                return { path: args.path, namespace: 'in-memory' };
                            }
                            if (args.path.startsWith('./') || args.path.startsWith('../')) {
                               const path = new URL(args.path, 'file://' + args.resolveDir + '/').pathname.substring(1);
                               const potentialPaths = [
                                 path, `${path}.js`, `${path}.jsx`, `${path}.ts`, `${path}.tsx`, `${path}.css`,
                                 `${path}/index.js`, `${path}/index.jsx`, `${path}/index.ts`, `${path}/index.tsx`
                               ];
                               for (const p of potentialPaths) {
                                   if (projectFiles[p]) return { path: p, namespace: 'in-memory' };
                               }
                            }
                            return { path: args.path, external: true };
                        });
                        build.onLoad({ filter: /.*/, namespace: 'in-memory' }, (args: any) => {
                            const fileContent = projectFiles[args.path];
                            if (fileContent === undefined) return { errors: [{ text: `File not found: ${args.path}` }] };
                            let loader = 'jsx';
                            if (args.path.endsWith('.css')) loader = 'css';
                            return { contents: fileContent, loader, resolveDir: args.path.substring(0, args.path.lastIndexOf('/')) };
                        });
                    }
                }],
                define: { 'process.env.NODE_ENV': '"production"' },
                jsxFactory: 'React.createElement',
                jsxFragment: 'React.Fragment',
            });
            setBundledCode(result.outputFiles[0].text);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            setBundledCode(null);
        }
    }, []);

    useEffect(() => {
        if (project.files) {
            bundleProject(project.files);
        }
    }, [project.files, bundleProject]);

    if (error) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white p-4">
                <div className="bg-red-900 text-red-200 p-4 rounded-lg font-mono max-w-2xl w-full">
                    <h2 className="font-bold text-lg mb-2">Application Error</h2>
                    <pre className="whitespace-pre-wrap">{error}</pre>
                    <a href="/" className="inline-block mt-4 text-blue-300 underline">Go Home</a>
                </div>
            </div>
        );
    }

    if (!bundledCode) {
        return (
             <div className="h-screen w-screen flex items-center justify-center bg-gray-100 text-gray-500">
                Bundling project...
            </div>
        )
    }

    return (
        <div className="h-screen w-screen bg-white">
            <Preview code={bundledCode} />
        </div>
    );
};

export default PreviewPage;