import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '../config/supabase';

const Posts = forwardRef((props, ref) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topics, setTopics] = useState([]);

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

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:profiles!posts_user_id_fkey(username),
          post_topics!inner(topic_id),
          topics:post_topics!inner(topics(*))
        `)
        .order('created_at', { ascending: false });

      if (selectedTopic) {
        query = query.eq('post_topics.topic_id', selectedTopic);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
      
      // Fetch comments for all posts
      const postIds = (data || []).map(post => post.id);
      if (postIds.length > 0) {
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*, profiles:profiles!comments_user_id_fkey(username)')
          .in('post_id', postIds)
          .order('created_at', { ascending: false });

        if (commentsError) throw commentsError;
        
        const commentsByPost = commentsData.reduce((acc, comment) => {
          acc[comment.post_id] = acc[comment.post_id] || [];
          acc[comment.post_id].push(comment);
          return acc;
        }, {});
        
        setComments(commentsByPost);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    fetchPosts
  }));

  useEffect(() => {
    fetchPosts();
  }, [selectedTopic]);

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const updatePostCounts = async (postId, supportDelta, opposeDelta) => {
    setPosts(currentPosts => 
      currentPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            support_count: Math.max(0, (post.support_count || 0) + supportDelta),
            oppose_count: Math.max(0, (post.oppose_count || 0) + opposeDelta)
          };
        }
        return post;
      })
    );
  };

  const handleReactionClick = async (postId, reactionType) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert('Please sign in to react to posts');
        return;
      }

      // First, check if user has already reacted
      const { data: existingReaction } = await supabase
        .from('user_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // Remove reaction
          await supabase
            .from('user_reactions')
            .delete()
            .eq('id', existingReaction.id);
          
          // Update local state
          updatePostCounts(
            postId,
            reactionType === 'support' ? -1 : 0,
            reactionType === 'oppose' ? -1 : 0
          );
        } else {
          // Update reaction
          await supabase
            .from('user_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existingReaction.id);
          
          // Update local state
          updatePostCounts(
            postId,
            reactionType === 'support' ? 1 : -1,
            reactionType === 'oppose' ? 1 : -1
          );
        }
      } else {
        // Add new reaction
        await supabase
          .from('user_reactions')
          .insert([{
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType
          }]);
        
        // Update local state
        updatePostCounts(
          postId,
          reactionType === 'support' ? 1 : 0,
          reactionType === 'oppose' ? 1 : 0
        );
      }

      // Update database counts in background
      const { data: supportData } = await supabase
        .from('user_reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('reaction_type', 'support');

      const { data: opposeData } = await supabase
        .from('user_reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('reaction_type', 'oppose');

      await supabase
        .from('posts')
        .update({
          support_count: supportData?.length || 0,
          oppose_count: opposeData?.length || 0
        })
        .eq('id', postId);

    } catch (error) {
      console.error('Error handling reaction:', error);
      alert('Error updating reaction. Please try again.');
    }
  };

  const handleCommentSubmit = async (postId) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert('Please sign in to comment');
        return;
      }

      const commentContent = newComments[postId]?.trim();
      if (!commentContent) {
        alert('Please enter a comment');
        return;
      }

      const { data: newComment, error: insertError } = await supabase
        .from('comments')
        .insert([{
          post_id: postId,
          user_id: user.id,
          content: commentContent
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Update local state
      setComments(prev => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])]
      }));

      setNewComments(prev => ({
        ...prev,
        [postId]: ''
      }));

    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading posts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Topic filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedTopic(null)}
          className={`px-3 py-1 rounded-full text-sm ${
            !selectedTopic
              ? 'bg-black text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Topics
        </button>
        {topics.map(topic => (
          <button
            key={topic.id}
            onClick={() => setSelectedTopic(topic.id)}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedTopic === topic.id
                ? 'bg-black text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {topic.name}
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No debates yet. Start one!
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">{post.profiles?.username || 'Unknown'}</div>
              <div className="text-sm text-gray-400">
                {new Date(post.created_at).toLocaleDateString()}
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
            <p className="text-gray-800 whitespace-pre-wrap mb-4">{post.content}</p>
            
            {/* Topics */}
            <div className="flex flex-wrap gap-2 mb-4">
              {post.topics.map(({ topics: topic }) => (
                <span
                  key={topic.id}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {topic.name}
                </span>
              ))}
            </div>
            
            <div className="flex items-center justify-between mb-4">
              {/* Reactions */}
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  className="text-gray-500 hover:text-black text-sm flex items-center space-x-1"
                  onClick={() => handleReactionClick(post.id, 'support')}
                >
                  <span>👍</span>
                  <span>Support ({post.support_count || 0})</span>
                </button>
                <button
                  type="button"
                  className="text-gray-500 hover:text-black text-sm flex items-center space-x-1"
                  onClick={() => handleReactionClick(post.id, 'oppose')}
                >
                  <span>👎</span>
                  <span>Oppose ({post.oppose_count || 0})</span>
                </button>
              </div>

              {/* Comment toggle button */}
              <button
                type="button"
                onClick={() => toggleComments(post.id)}
                className="text-gray-500 hover:text-black text-sm flex items-center space-x-1"
              >
                <span>💬</span>
                <span>Comments ({(comments[post.id] || []).length})</span>
              </button>
            </div>

            {/* Latest comment preview */}
            {!expandedComments[post.id] && comments[post.id]?.[0] && (
              <div className="border-t pt-4">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">{comments[post.id][0].profiles?.username || 'Unknown'}: </span>
                  <span className="text-gray-600">{comments[post.id][0].content}</span>
                </div>
              </div>
            )}

            {/* Expanded comments section */}
            {expandedComments[post.id] && (
              <div className="border-t pt-4">
                <div className="mb-4 space-y-2">
                  {(comments[post.id] || []).map((comment) => (
                    <div key={comment.id} className="text-sm">
                      <span className="font-medium text-gray-700">{comment.profiles?.username || 'Unknown'}: </span>
                      <span className="text-gray-600">{comment.content}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newComments[post.id] || ''}
                    onChange={(e) => setNewComments(prev => ({
                      ...prev,
                      [post.id]: e.target.value
                    }))}
                    placeholder="Add a comment..."
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCommentSubmit(post.id);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCommentSubmit(post.id)}
                    className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800"
                  >
                    Comment
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
});

export default Posts;

export default Posts