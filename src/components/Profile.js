import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [userReactions, setUserReactions] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState(null);
  const [usernameSuccess, setUsernameSuccess] = useState(null);

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

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setUsernameInput(data.username);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [user]);

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
      fetchProfile();
      fetchUserContent();
    }
  }, [user, fetchProfile, fetchUserContent]);

  const handleUsernameUpdate = async () => {
    setUsernameError(null);
    setUsernameSuccess(null);

    if (!usernameInput || usernameInput.trim() === '') {
      setUsernameError('Username cannot be empty.');
      return;
    }

    try {
      // Check if username is unique
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', usernameInput)
        .neq('id', user.id)
        .single();

      if (existing) {
        setUsernameError('Username already taken. Please choose another.');
        return;
      }

      // Update username
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: usernameInput })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUsernameSuccess('Username updated successfully.');
      fetchProfile();
    } catch (error) {
      setUsernameError('Failed to update username. Please try again.');
      console.error('Error updating username:', error);
    }
  };

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
              {profile?.username?.[0].toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{profile?.username}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Joined {new Date(user?.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="mt-4 max-w-md w-full">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
            />
            {usernameError && <p className="text-red-600 mt-1">{usernameError}</p>}
            {usernameSuccess && <p className="text-green-600 mt-1">{usernameSuccess}</p>}
            <button
              onClick={handleUsernameUpdate}
              className="mt-2 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Update Username
            </button>
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
