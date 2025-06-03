import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '../config/supabase';

const Posts = forwardRef((props, ref) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    fetchPosts
  }));

  useEffect(() => {
    fetchPosts();
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading posts...</div>;
  }

  return (
    <div className="space-y-6">
      {posts.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No debates yet. Start one!
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">{post.user_email}</div>
              <div className="text-sm text-gray-400">
                {new Date(post.created_at).toLocaleDateString()}
              </div>
            </div>
            <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
            <div className="mt-4 flex items-center space-x-4">
              <button className="text-gray-500 hover:text-black text-sm flex items-center space-x-1">
                <span>💬</span>
                <span>Reply</span>
              </button>
              <button className="text-gray-500 hover:text-black text-sm flex items-center space-x-1">
                <span>👍</span>
                <span>Support</span>
              </button>
              <button className="text-gray-500 hover:text-black text-sm flex items-center space-x-1">
                <span>👎</span>
                <span>Oppose</span>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
});

export default Posts;
