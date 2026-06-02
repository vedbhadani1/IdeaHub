import React, { useEffect, useState } from 'react';
import { usePostStore } from '@/stores/post.store';
import PostCard from '@/components/posts/PostCard';
import CreatePostModal from '@/components/posts/CreatePostModal';
import Loader from '@/components/shared/Loader';
import EmptyState from '@/components/shared/EmptyState';

const CATEGORIES = ['', 'BUG', 'IMPROVEMENT', 'SUGGESTION', 'FEATURE', 'IDEA', 'DISCUSSION'];
const STATUSES   = ['', 'BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'];
const PRIORITIES = ['', 'LOW', 'MEDIUM', 'HIGH'];

const FeedPage: React.FC = () => {
  const { feed, loading, fetchFeed, reactToPost } = usePostStore();
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus]     = useState('');
  const [priority, setPriority] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchFeed({ search, category, status, priority });
  }, [search, category, status, priority]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Search + Filters */}
      <div className="card p-4 space-y-3">
        <input
          className="input"
          placeholder="🔍  Search posts by title or content…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <select className="input flex-1 min-w-[120px]" value={category}
            onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
          <select className="input flex-1 min-w-[120px]" value={status}
            onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select className="input flex-1 min-w-[120px]" value={priority}
            onChange={(e) => setPriority(e.target.value)}>
            <option value="">All Priorities</option>
            {PRIORITIES.filter(Boolean).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{feed.length} post{feed.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ New Post</button>
      </div>

      {loading ? (
        <Loader />
      ) : feed.length === 0 ? (
        <EmptyState
          icon="🗒️"
          title="No posts found"
          description="Try different filters or create the first post!"
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Create a Post
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {feed.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onReact={(id, emoji) => reactToPost(id, emoji)}
            />
          ))}
        </div>
      )}

      <CreatePostModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default FeedPage;
