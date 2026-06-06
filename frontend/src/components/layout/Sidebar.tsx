import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import Avatar from '@/components/shared/Avatar';

const NAV = [
  { to: '/dashboard',     icon: '🏠', label: 'Dashboard' },
  { to: '/feed',          icon: '📋', label: 'Feed' },
  { to: '/ideas',         icon: '💡', label: 'Ideas Space' },
  { to: '/archive',       icon: '🗄️',  label: 'Archive' },
  { to: '/notifications', icon: '🔔', label: 'Notifications' },
  { to: '/profile',       icon: '👤', label: 'Profile' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0 transition-transform duration-200 ease-in-out
      w-60 flex-shrink-0 h-screen bg-white border-r border-surface-border
      flex flex-col overflow-y-auto
    `}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">IdeaHub</p>
            <p className="text-xs text-gray-400">Internal Network</p>
          </div>
        </div>
        <button className="md:hidden text-gray-500 hover:bg-gray-100 p-1 rounded" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="text-base w-5 text-center">{icon}</span>
            <span className="flex-1">{label}</span>
            {to === '/notifications' && unreadCount > 0 && (
              <span className="ml-auto bg-brand-500 text-white text-xs rounded-full w-5 h-5
                               flex items-center justify-center font-semibold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-surface-border">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <Avatar user={user} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.role?.replace('_', '/')}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
        >
          → Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
