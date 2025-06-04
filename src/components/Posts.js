import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '../config/supabase';

const Posts = forwardRef((props, ref) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
      
      // Fetch comments for all posts
      const postIds = (data || []).map(post => post.id);
      if (postIds.length > 0) {
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .in('post_id', postIds)
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;
        
        // Group comments by post_id
        const commentsByPost = commentsData.reduce((acc, comment) => {
          acc[comment.post_id] = acc[comment.post_id] || [];
          acc[comment.post_id].push(comment);
          return acc;
        }, {});
        
        setComments(commentsByPost);
      }
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

  const handleReaction = async (postId, reactionType) => {
    try {
      const user = supabase.auth.user();
      if (!user) {
        alert('Please sign in to react to posts');
        return;
      }

      // Check if user has already reacted
      const { data: existingReaction } = await supabase
        .from('user_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // Remove reaction if clicking the same button
          await supabase
            .from('user_reactions')
            .delete()
            .eq('id', existingReaction.id);
        } else {
          // Update reaction if changing from support to oppose or vice versa
          await supabase
            .from('user_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existingReaction.id);
        }
      } else {
        // Add new reaction
        await supabase
          .from('user_reactions')
          .insert([
            {
              post_id: postId,
              user_id: user.id,
              reaction_type: reactionType
            }
          ]);
      }

      // Update post counts
      const { data: reactionCounts } = await supabase
        .from('user_reactions')
        .select('reaction_type, count(*)')
        .eq('post_id', postId)
        .group('reaction_type');

      const supportCount = reactionCounts?.find(r => r.reaction_type === 'support')?.count || 0;
      const opposeCount = reactionCounts?.find(r => r.reaction_type === 'oppose')?.count || 0;

      await supabase
        .from('posts')
        .update({
          support_count: supportCount,
          oppose_count: opposeCount
        })
        .eq('id', postId);

      // Refresh posts
      fetchPosts();
    } catch (error) {
      console.error('Error handling reaction:', error.message);
    }
  };

  const handleComment = async (postId) => {
    try {
      const user = supabase.auth.user();
      if (!user) {
        alert('Please sign in to comment');
        return;
      }

      const commentContent = newComments[postId]?.trim();
      if (!commentContent) {
        alert('Please enter a comment');
        return;
      }

      await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: user.id,
            user_email: user.email,
            content: commentContent
          }
        ]);

      // Clear comment input
      setNewComments(prev => ({
        ...prev,
        [postId]: ''
      }));

      // Refresh posts and comments
      fetchPosts();
    } catch (error) {
      console.error('Error adding comment:', error.message);
    }
  };

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
            <p className="text-gray-800 whitespace-pre-wrap mb-4">{post.content}</p>
            
            {/* Reactions */}
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => handleReaction(post.id, 'support')}
                className="text-gray-500 hover:text-black text-sm flex items-center space-x-1"
              >
                <span>👍</span>
                <span>Support ({post.support_count || 0})</span>
              </button>
              <button
                onClick={() => handleReaction(post.id, 'oppose')}
                className="text-gray-500 hover:text-black text-sm flex items-center space-x-1"
              >
                <span>👎</span>
                <span>Oppose ({post.oppose_count || 0})</span>
              </button>
            </div>

            {/* Comments section */}
            <div className="border-t pt-4">
              <div className="mb-4">
                {(comments[post.id] || []).map((comment) => (
                  <div key={comment.id} className="mb-2 text-sm">
                    <span className="font-medium text-gray-700">{comment.user_email}: </span>
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
                />
                <button
                  onClick={() => handleComment(post.id)}
                  className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800"
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
});

export default Posts;
