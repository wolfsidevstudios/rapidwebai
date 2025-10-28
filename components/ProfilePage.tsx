import React from 'react';
import type { UserProfile, Project } from '../App';

interface ProfilePageProps {
    user: UserProfile | null;
    projects: Project[];
    onOpenProject: (id: string) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, projects, onOpenProject }) => {
    if (!user) {
        return (
            <div className="h-full w-full bg-gray-900 flex items-center justify-center text-white">
                <p>Loading profile...</p>
            </div>
        )
    }

    const sortedProjects = [...projects].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="h-full w-full overflow-y-auto bg-gray-900 text-white">
            <div className="container mx-auto px-4 pt-8 pb-12 max-w-4xl">
                <div className="flex items-center space-x-6 border-b border-gray-700 pb-10 mb-10">
                    <img src={user.picture} alt={user.name} className="w-24 h-24 rounded-full" />
                    <div>
                        <h1 className="text-3xl font-bold">{user.name}</h1>
                        <p className="text-gray-400">{user.email}</p>
                    </div>
                </div>
                
                <h2 className="text-2xl font-semibold mb-6">My Projects</h2>
                {sortedProjects.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedProjects.map(project => (
                            <div 
                                key={project.id} 
                                onClick={() => onOpenProject(project.id)}
                                className="bg-gray-800 p-6 rounded-xl cursor-pointer hover:bg-gray-700 hover:scale-105 transform transition-all duration-200"
                            >
                                <h3 className="font-bold text-lg truncate mb-2">{project.name}</h3>
                                <p className="text-sm text-gray-400">
                                    Created: {new Date(project.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-gray-800 rounded-xl">
                        <p className="text-gray-400">You haven't created any projects yet.</p>
                        <a href="/" className="mt-4 inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                            Create your first project
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;