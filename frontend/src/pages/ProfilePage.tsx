import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';
import { User, Post } from '@/types';
import Avatar from '@/components/shared/Avatar';
import Loader from '@/components/shared/Loader';
import PostCard from '@/components/posts/PostCard';
import { usePostStore } from '@/stores/post.store';

const ProfilePage: React.FC = () => {
  const { id } = useParams();
  const { user: currentUser, fetchMe } = useAuthStore();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', avatarUrl: '' });
  const [saving, setSaving] = useState(false);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const isOwnProfile = !id || Number(id) === currentUser?.id;

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        let userToSet = null;
        if (isOwnProfile) {
          userToSet = currentUser;
          setForm({
            name: currentUser?.name || '',
            bio: currentUser?.bio || '',
            avatarUrl: currentUser?.avatarUrl || '',
          });
        } else {
          const { data } = await api.get(`/users/${id}`);
          userToSet = data;
        }
        setProfileUser(userToSet);
        
        if (userToSet) {
          setPostsLoading(true);
          try {
            const res = await api.get(`/posts?authorId=${userToSet.id}&status=ALL`);
            setPosts(res.data.data || []);
          } catch (err) {
            console.error('Failed to fetch user posts', err);
          } finally {
            setPostsLoading(false);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, currentUser, isOwnProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnProfile) return;

    setSaving(true);
    try {
      await api.patch('/auth/me', form);
      await fetchMe();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (!profileUser) return <div className="text-center text-gray-500 py-10">User not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="card overflow-hidden">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-brand-400 to-indigo-500"></div>

        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="-mt-12 mb-4 flex justify-between items-end">
            <div className="rounded-full p-1 bg-white inline-block">
              <Avatar user={profileUser} size="lg" className="w-24 h-24 text-3xl" />
            </div>
            {isOwnProfile && !editing && (
              <button onClick={() => setEditing(true)} className="btn-ghost text-sm">
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4 animate-in">
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea className="input resize-none min-h-[80px]" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
              </div>
              <div>
                <label className="label">Avatar URL (Optional)</label>
                <input className="input" type="url" value={form.avatarUrl} onChange={e => setForm({ ...form, avatarUrl: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          ) : (
            <div className="animate-in">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{profileUser.name}</h1>
              <p className="text-sm font-medium text-brand-600 mb-4">{profileUser.role?.replace('_', '/')}</p>

              <div className="text-gray-600 text-sm whitespace-pre-wrap mb-6">
                {profileUser.bio || <span className="italic text-gray-400">No bio provided</span>}
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-surface-border text-sm">
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 text-lg">{profileUser._count?.posts ?? 0}</span>
                  <span className="text-gray-500">Posts</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 text-lg">{profileUser._count?.comments ?? 0}</span>
                  <span className="text-gray-500">Comments</span>
                </div>
                <div className="ml-auto text-gray-400 text-xs text-right">
                  Joined<br />
                  {new Date(profileUser.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!editing && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Posts</h2>
          {postsLoading ? (
            <Loader />
          ) : posts.length > 0 ? (
            posts.map(post => <PostCard key={post.id} post={post as any} />)
          ) : (
            <div className="text-gray-500 text-center py-6 bg-white rounded-lg border border-surface-border">
              This user hasn't posted anything yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
