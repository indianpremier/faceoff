import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../config/supabase';
import Posts from './Posts';

export default function Home({ user }) {
  const [newPost, setNewPost] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const postsRef = useRef();

  useEffect(() => {
    const fetchTopics = async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching topics:', error);
      } else {
        setTopics(data);
      }
    };

    fetchTopics();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() || !newTitle.trim() || selectedTopics.length === 0) {
      alert('Please fill in all fields and select at least one topic');
      return;
    }

    try {
      setLoading(true);
      
      // Insert post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert([
          {
            title: newTitle,
            content: newPost,
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (postError) throw postError;

      // Insert topic associations
      const topicAssociations = selectedTopics.map(topicId => ({
        post_id: post.id,
        topic_id: topicId
      }));

      const { error: topicError } = await supabase
        .from('post_topics')
        .insert(topicAssociations);

      if (topicError) throw topicError;

      setNewPost('');
      setNewTitle('');
      setSelectedTopics([]);
      
      // Refresh posts
      if (postsRef.current) {
        postsRef.current.fetchPosts();
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicToggle = (topicId) => {
    setSelectedTopics(prev => 
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
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
              <span className="text-gray-700 mr-4">{profile?.username || 'Loading...'}</span>
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
            <div className="mb-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Debate title..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Present your argument..."
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              rows="3"
            />
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Topics (at least one)
              </label>
              <div className="flex flex-wrap gap-2">
                {topics.map(topic => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleTopicToggle(topic.id)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedTopics.includes(topic.id)
                        ? 'bg-black text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {topic.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Posting...' : 'Start Debate'}
              </button>
            </div>
          </form>
        </div>

        <Posts ref={postsRef} />
      </div>
    </div>
  );
}