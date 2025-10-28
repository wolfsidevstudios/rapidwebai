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

    return (
        <div className="h-screen w-screen bg-white">
            <Preview files={project.files} onConsoleMessage={handleConsoleMessage} clearConsole={clearConsole} />
        </div>
    );
};

export default PreviewPage;
