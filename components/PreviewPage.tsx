import React, { useState, useEffect, useCallback } from 'react';
import Preview from './Preview';
import type { Project } from '../App';

interface PreviewPageProps {
    project: Project;
}

const PreviewPage: React.FC<PreviewPageProps> = ({ project }) => {
    const [transpiledCode, setTranspiledCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const transpileCode = useCallback((codeToTranspile: string) => {
        try {
            // @ts-ignore - Babel is loaded from a script tag
            const result = Babel.transform(codeToTranspile, {
                presets: ['env', 'react', 'typescript'],
                filename: 'Component.tsx',
                plugins: [
                    "transform-modules-commonjs"
                ]
            });
            setTranspiledCode(result.code);
            setError(null);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown transpilation error occurred.');
            }
            setTranspiledCode(null);
        }
    }, []);

    useEffect(() => {
        if (project.code) {
            transpileCode(project.code);
        }
    }, [project.code, transpileCode]);

    if (error) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white p-4">
                <div className="bg-red-900 text-red-200 p-4 rounded-lg font-mono max-w-2xl">
                    <h2 className="font-bold text-lg mb-2">Transpilation Error</h2>
                    <pre className="whitespace-pre-wrap">{error}</pre>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-white">
            <Preview code={transpiledCode} />
        </div>
    );
};

export default PreviewPage;