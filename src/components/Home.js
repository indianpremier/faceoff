import React, { useState, useRef } from 'react';
import { supabase } from '../config/supabase';
import Posts from './Posts';

export default function Home({ user }) {
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const postsRef = useRef();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('posts')
        .insert([
          {
            content: newPost,
            user_id: user.id,
            user_email: user.email
          }
        ]);

      if (error) throw error;
      setNewPost('');
      // Refresh posts after successful creation
      if (postsRef.current) {
        postsRef.current.fetchPosts();
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">FaceOff</h1>
            </div>
            <div className="flex items-center">
              <span className="text-gray-700 mr-4">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <form onSubmit={handleSubmitPost}>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Start a political debate..."
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              rows="3"
            />
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Posting...' : 'Post Debate'}
              </button>
            </div>
          </form>
        </div>

        <Posts ref={postsRef} />
      </div>
    </div>
  );
}
