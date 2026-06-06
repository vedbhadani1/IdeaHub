import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import CreatePostModal from '@/components/posts/CreatePostModal';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/feed':          'Product Feed',
  '/ideas':         'Ideas Space',
  '/archive':       'Memory Archive',
  '/notifications': 'Notifications',
  '/profile':       'Profile',
};

interface TopbarProps {
  onMenuClick?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { pathname } = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  const title = PAGE_TITLES[pathname] ?? 'IdeaHub';

  return (
    <>
      <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-white border-b
                         border-surface-border sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick} 
            className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-800">{title}</h1>
        </div>
        <button
          id="create-post-btn"
          onClick={() => setModalOpen(true)}
          className="btn-primary"
        >
          <span className="text-base leading-none md:hidden">+</span>
          <span className="hidden md:inline-block text-base leading-none">+</span>
          <span className="hidden md:inline-block ml-1">New Post</span>
        </button>
      </header>

      <CreatePostModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default Topbar;
