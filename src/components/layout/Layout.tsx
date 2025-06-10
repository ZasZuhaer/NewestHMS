import React, { ReactNode } from 'react';
import Header from './Header';
import Tabs from './Tabs';
import { TabType } from '../../types';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 p-4 sm:p-6">
        <div className="w-full max-w-full">
          {children}
        </div>
      </main>
      <Toaster
        position="bottom-left"
        toastOptions={{
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
          },
          error: {
            duration: 4000,
          },
        }}
      />
    </div>
  );
};

export default Layout;