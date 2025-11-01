import React from 'react';
import Preview from './Preview';
import type { Project } from '../App';

interface PreviewPageProps {
    project: Project;
}

const PreviewPage: React.FC<PreviewPageProps> = ({ project }) => {
    return (
        <div className="h-screen w-screen bg-white">
            <Preview files={project.files} />
        </div>
    );
};

export default PreviewPage;