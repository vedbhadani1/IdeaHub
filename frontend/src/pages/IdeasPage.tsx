import React, { useEffect, useState } from 'react';
import { usePostStore } from '@/stores/post.store';
import { useAuthStore } from '@/stores/auth.store';
import IdeaCard from '@/components/ideas/IdeaCard';
import CreatePostModal from '@/components/posts/CreatePostModal';
import Loader from '@/components/shared/Loader';
import EmptyState from '@/components/shared/EmptyState';
import api from '@/api/axios';

const CATEGORIES = ['', 'BUG', 'IMPROVEMENT', 'SUGGESTION', 'FEATURE', 'IDEA', 'DISCUSSION'];

const IdeasPage: React.FC = () => {
  const { feed, loading, fetchFeed, reactToPost } = usePostStore();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('');

  useEffect(() => {
    fetchFeed({ category });
  }, [category]);

  const ideas = feed;

  const handleApprove = async (id: number) => {
    await api.patch(`/posts/${id}/status`, { status: 'RESOLVED' });
    fetchFeed({ category });
  };

  const myIdeas = ideas.filter((i) => i.authorId === user?.id);
  const open     = ideas.filter((i) => (i.status === 'TODO' || i.status === 'BACKLOG') && i.authorId !== user?.id);
  const approved = ideas.filter((i) => i.status === 'DONE');
  const archived = ideas.filter((i) => false); // Or remove this section later if UI doesn't need it

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="card p-5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">💡 Ideas Space</h2>
            <p className="text-sm opacity-80 mt-1">
              Share product ideas, vote on them, and track what gets approved.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg
                       text-sm font-medium transition-colors"
          >
            + Share Idea
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex justify-end">
        <select 
          className="input w-48" 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : ideas.length === 0 ? (
        <EmptyState
          icon="💡"
          title="No ideas yet"
          description="Be the first to share an idea with the team!"
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Share an Idea
            </button>
          }
        />
      ) : (
        <>
          {/* My Active Ideas */}
          {myIdeas.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full" />
                My Active Ideas ({myIdeas.length})
              </h3>
              <div className="space-y-4">
                {myIdeas.map((p) => (
                  <IdeaCard
                    key={p.id}
                    post={p}
                    onReact={(id, emoji) => reactToPost(id, emoji)}
                    onApprove={(user?.role === 'FOUNDER' || user?.role === 'ADMIN') ? handleApprove : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Open */}
          {open.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full" />
                Open Ideas ({open.length})
              </h3>
              <div className="space-y-4">
                {open.map((p) => (
                  <IdeaCard
                    key={p.id}
                    post={p}
                    onReact={(id, emoji) => reactToPost(id, emoji)}
                    onApprove={(user?.role === 'FOUNDER' || user?.role === 'ADMIN') ? handleApprove : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Approved Ideas ({approved.length})
              </h3>
              <div className="space-y-4">
                {approved.map((p) => (
                  <IdeaCard
                    key={p.id}
                    post={p}
                    onReact={(id, emoji) => reactToPost(id, emoji)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Archived */}
          {archived.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                Archived Ideas ({archived.length})
              </h3>
              <div className="space-y-4">
                {archived.map((p) => (
                  <IdeaCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <CreatePostModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default IdeasPage;
