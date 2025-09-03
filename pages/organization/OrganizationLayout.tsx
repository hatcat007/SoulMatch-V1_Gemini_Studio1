import React from 'react';
import OrganizationSidebar from '../../components/organization/OrganizationSidebar';

const OrganizationLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-dark-background">
            <OrganizationSidebar />
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                {children}
            </main>
        </div>
    );
};

export default OrganizationLayout;