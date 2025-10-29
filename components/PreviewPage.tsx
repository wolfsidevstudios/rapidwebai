import React from 'react';
import Preview from './Preview';
import type { Project } from '../App';

interface PreviewPageProps {
    project: Project;
}

const PreviewPage: React.FC<PreviewPageProps> = ({ project }) => {
    // A dummy handler for console messages on the public page, as there's no console UI to display them.
    const handleConsoleMessage = () => {}; 
    const clearConsole = () => {};

    const codeToPreview = project.files['pages/index.tsx'] || '<div>Project main page not found.</div>';

    return (
        <div className="h-screen w-screen bg-white">
            <Preview code={codeToPreview} onConsoleMessage={handleConsoleMessage} clearConsole={clearConsole} />
        </div>
    );
};

export default PreviewPage;
