import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { usePostStore } from '@/stores/post.store';
import { useNotificationStore } from '@/stores/notification.store';
import PostCard from '@/components/posts/PostCard';
import Loader from '@/components/shared/Loader';
import EmptyState from '@/components/shared/EmptyState';

const StatCard: React.FC<{ icon: string; label: string; value: number; color: string }> = ({
  icon, label, value, color,
}) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { feed, loading, fetchFeed } = usePostStore();
  const { list: notifications, unreadCount } = useNotificationStore();

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const openCount = feed.filter((p) => p.status === 'TODO' || p.status === 'BACKLOG').length;
  const inProgressCount = feed.filter((p) => p.status === 'IN_PROGRESS').length;
  const ideaCount = feed.filter((p) => p.category === 'IDEA').length;
  const assignedCount = feed.filter((p) => p.assigneeId === user?.id).length;

  const recent = feed.slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="card p-6 bg-gradient-to-r from-brand-500 to-brand-600 text-white border-0">
        <p className="text-sm opacity-80 mb-1">Good day,</p>
        <h2 className="text-2xl font-bold">{user?.name ?? 'Team member'} 👋</h2>
        <p className="text-sm opacity-80 mt-1">{user?.role?.replace('_', '/')} · {user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon="🟢" label="Open Issues"    value={openCount}      color="bg-blue-50" />
        <StatCard icon="⏳" label="In Progress"   value={inProgressCount} color="bg-yellow-50" />
        <StatCard icon="💡" label="Active Ideas"   value={ideaCount}      color="bg-amber-50" />
        <StatCard icon="📌" label="Assigned to Me" value={assignedCount}  color="bg-purple-50" />
      </div>

      {/* Notifications banner */}
      {unreadCount > 0 && (
        <Link
          to="/notifications"
          className="card p-4 flex items-center gap-3 bg-brand-50 border-brand-200
                     hover:bg-brand-100 transition-colors"
        >
          <span className="text-2xl">🔔</span>
          <div>
            <p className="text-sm font-semibold text-brand-700">
              You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-brand-500">Click to view them →</p>
          </div>
        </Link>
      )}

      {/* Recent posts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Recent Discussions</h3>
          <Link to="/feed" className="text-sm text-brand-500 hover:underline">View all →</Link>
        </div>

        {loading ? (
          <Loader />
        ) : recent.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No posts yet"
            description="Be the first to start a discussion!"
          />
        ) : (
          <div className="space-y-3">
            {recent.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
