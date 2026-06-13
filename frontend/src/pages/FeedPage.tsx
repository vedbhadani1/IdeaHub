import React, { useEffect, useState } from 'react';
import api from '@/api/axios';
import { usePostStore } from '@/stores/post.store';
import { useAuthStore } from '@/stores/auth.store';
import PostCard from '@/components/posts/PostCard';
import CreatePostModal from '@/components/posts/CreatePostModal';
import Loader from '@/components/shared/Loader';
import EmptyState from '@/components/shared/EmptyState';
import { Post, User } from '@/types';

const CATEGORIES = ['BUG', 'IMPROVEMENT', 'SUGGESTION', 'FEATURE', 'IDEA', 'DISCUSSION', 'PROBLEM'];
const STATUSES   = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const FeedPage: React.FC = () => {
  const { feed, loading, hasMore, loadingMore, fetchFeed, fetchMoreFeed, reactToPost, deletePost } = usePostStore();
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus]     = useState('');
  const [priority, setPriority] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [creators, setCreators] = useState<Pick<User, 'id' | 'name'>[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/users', { params: { limit: 100 } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setCreators(list.map((u: User) => ({ id: u.id, name: u.name })));
      })
      .catch(() => {})
      .finally(() => setCreatorsLoading(false));
  }, []);

  useEffect(() => {
    fetchFeed({
      search,
      category,
      status,
      priority,
      authorId: authorId ? Number(authorId) : undefined,
    });
  }, [search, category, status, priority, authorId]);

  const hasActiveFilters = category || status || priority || search || authorId;
  const selectedCreator = creators.find((c) => String(c.id) === authorId);

  const clearAllFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setPriority('');
    setAuthorId('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="card p-4 space-y-3">
        <input
          className="input"
          placeholder="🔍  Search posts by title or content…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <select
            className="input flex-1 min-w-[130px]"
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
            disabled={creatorsLoading}
          >
            <option value="">All Users</option>
            {creators.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select className="input flex-1 min-w-[130px]" value={category}
            onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase().replace('_', ' ')}</option>
            ))}
          </select>
          <select className="input flex-1 min-w-[130px]" value={status}
            onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select className="input flex-1 min-w-[130px]" value={priority}
            onChange={(e) => setPriority(e.target.value)}>
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-gray-500">Active filters:</span>
            {authorId && selectedCreator && (
              <span className="badge">
                {selectedCreator.name}
                <button onClick={() => setAuthorId('')} className="ml-1 text-gray-400 hover:text-gray-700">×</button>
              </span>
            )}
            {search && (
              <span className="badge">Search: "{search}" <button onClick={() => setSearch('')} className="ml-1 text-gray-400 hover:text-gray-700">×</button></span>
            )}
            {category && (
              <span className="badge">{category} <button onClick={() => setCategory('')} className="ml-1 text-gray-400 hover:text-gray-700">×</button></span>
            )}
            {status && (
              <span className="badge">{status.replace(/_/g, ' ')} <button onClick={() => setStatus('')} className="ml-1 text-gray-400 hover:text-gray-700">×</button></span>
            )}
            {priority && (
              <span className="badge">{priority} <button onClick={() => setPriority('')} className="ml-1 text-gray-400 hover:text-gray-700">×</button></span>
            )}
            <button onClick={clearAllFilters} className="text-xs text-red-400 hover:text-red-600 ml-1 underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{feed.length} post{feed.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <Loader />
      ) : feed.length === 0 ? (
        <EmptyState
          icon="🗒️"
          title={authorId ? 'No posts found for this user' : 'No posts found'}
          description={
            authorId
              ? `${selectedCreator?.name ?? 'This user'} hasn't posted anything matching your filters.`
              : hasActiveFilters
                ? 'No posts match your filters. Try clearing some.'
                : 'Be the first to post something!'
          }
          action={
            hasActiveFilters ? (
              <button onClick={clearAllFilters} className="btn-ghost">Clear Filters</button>
            ) : (
              <button onClick={() => setShowModal(true)} className="btn-primary">Create a Post</button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {feed.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onReact={(id, emoji) => reactToPost(id, emoji)}
              onEdit={(p) => setEditingPost(p)}
              onDelete={(id) => deletePost(id)}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-4 pb-8">
              <button 
                onClick={() => fetchMoreFeed()} 
                className="btn-secondary px-6 py-2"
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}

      <CreatePostModal isOpen={showModal} onClose={() => setShowModal(false)} />
      <CreatePostModal
        isOpen={Boolean(editingPost)}
        onClose={() => setEditingPost(null)}
        post={editingPost}
      />
    </div>
  );
};

export default FeedPage;
