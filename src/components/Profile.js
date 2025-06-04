import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [userReactions, setUserReactions] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');

  const fetchUserData = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (!session) {
        navigate('/auth');
        return;
      }
      
      setUser(session.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      navigate('/auth');
    }
  }, [navigate]);

  const fetchUserContent = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Fetch user's posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setUserPosts(posts || []);

      // Fetch user's comments
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('*, posts(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;
      setUserComments(comments || []);

      // Fetch user's reactions
      const { data: reactions, error: reactionsError } = await supabase
        .from('user_reactions')
        .select('*, posts(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (reactionsError) throw reactionsError;
      setUserReactions(reactions || []);

    } catch (error) {
      console.error('Error fetching user content:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    if (user) {
      fetchUserContent();
    }
  }, [user, fetchUserContent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Profile Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-2xl mb-4">
              {user?.email?.[0].toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{user?.email}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Joined {new Date(user?.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('posts')}
              className={`${
                activeTab === 'posts'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Posts ({userPosts.length})
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`${
                activeTab === 'comments'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Comments ({userComments.length})
            </button>
            <button
              onClick={() => setActiveTab('reactions')}
              className={`${
                activeTab === 'reactions'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Reactions ({userReactions.length})
            </button>
          </nav>
        </div>

        {/* Content Sections */}
        <div className="mt-6 space-y-6">
          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="space-y-6">
              {userPosts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No posts yet</p>
              ) : (
                userPosts.map((post) => (
                  <div key={post.id} className="bg-white shadow rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-4 text-sm">
                        <span>👍 {post.support_count || 0}</span>
                        <span>👎 {post.oppose_count || 0}</span>
                      </div>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              {userComments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No comments yet</p>
              ) : (
                userComments.map((comment) => (
                  <div key={comment.id} className="bg-white shadow rounded-lg p-6">
                    <div className="mb-4">
                      <div className="text-sm text-gray-500 mb-2">
                        Commented on {new Date(comment.created_at).toLocaleDateString()}
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-gray-600">{comment.posts?.content}</p>
                      </div>
                      <p className="text-gray-800">Your comment: {comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Reactions Tab */}
          {activeTab === 'reactions' && (
            <div className="space-y-6">
              {userReactions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No reactions yet</p>
              ) : (
                userReactions.map((reaction) => (
                  <div key={reaction.id} className="bg-white shadow rounded-lg p-6">
                    <div className="mb-4">
                      <div className="text-sm text-gray-500 mb-2">
                        Reacted {reaction.reaction_type === 'support' ? '👍' : '👎'} on{' '}
                        {new Date(reaction.created_at).toLocaleDateString()}
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">{reaction.posts?.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
