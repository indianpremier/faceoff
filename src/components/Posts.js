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
  }, []);

  const handleReaction = async (e, postId, reactionType) => {
    e.preventDefault(); // Prevent form submission/page refresh
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        alert('Authentication error. Please sign in again.');
        return;
      }
      
      if (!user) {
        alert('Please sign in to react to posts');
        return;
      }

      console.log('Checking existing reaction...');
      const { data: existingReaction, error: existingError } = await supabase
        .from('user_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing reaction:', existingError);
        throw existingError;
      }

      let updateError;
      if (existingReaction) {
        console.log('Existing reaction found:', existingReaction);
        if (existingReaction.reaction_type === reactionType) {
          console.log('Deleting reaction...');
          const { error: deleteError } = await supabase
            .from('user_reactions')
            .delete()
            .eq('id', existingReaction.id);
          updateError = deleteError;
        } else {
          console.log('Updating reaction...');
          const { error: updateReactionError } = await supabase
            .from('user_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existingReaction.id);
          updateError = updateReactionError;
        }
      } else {
        console.log('Adding new reaction...');
        const { error: insertError } = await supabase
          .from('user_reactions')
          .insert([
            {
              post_id: postId,
              user_id: user.id,
              reaction_type: reactionType
            }
          ]);
        updateError = insertError;
      }

      if (updateError) {
        console.error('Error updating reaction:', updateError);
        throw updateError;
      }

      console.log('Fetching reaction counts...');
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

      const supportCount = supportData?.length || 0;
      const opposeCount = opposeData?.length || 0;

      console.log('Updating post counts...', { supportCount, opposeCount });
      const { error: postUpdateError } = await supabase
        .from('posts')
        .update({
          support_count: supportCount,
          oppose_count: opposeCount
        })
        .eq('id', postId);

      if (postUpdateError) {
        console.error('Error updating post counts:', postUpdateError);
        throw postUpdateError;
      }

      console.log('Refreshing posts...');
      await fetchPosts();
      console.log('Reaction handling complete');
    } catch (error) {
      console.error('Error handling reaction:', error);
      alert(`Error handling reaction: ${error.message || 'Please try again.'}`);
    }
  };

  const handleComment = async (e, postId) => {
    e.preventDefault(); // Prevent form submission/page refresh
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        alert('Authentication error. Please sign in again.');
        return;
      }

      if (!user) {
        alert('Please sign in to comment');
        return;
      }

      const commentContent = newComments[postId]?.trim();
      if (!commentContent) {
        alert('Please enter a comment');
        return;
      }

      const { error: insertError } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: user.id,
            user_email: user.email,
            content: commentContent
          }
        ]);

      if (insertError) {
        console.error('Error inserting comment:', insertError);
        throw insertError;
      }

      setNewComments(prev => ({
        ...prev,
        [postId]: ''
      }));

      await fetchPosts();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert(`Error adding comment: ${error.message || 'Please try again.'}`);
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
                onClick={(e) => handleReaction(e, post.id, 'support')}
                className="text-gray-500 hover:text-black text-sm flex items-center space-x-1"
              >
                <span>👍</span>
                <span>Support ({post.support_count || 0})</span>
              </button>
              <button
                onClick={(e) => handleReaction(e, post.id, 'oppose')}
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
              
              <form onSubmit={(e) => handleComment(e, post.id)} className="flex space-x-2">
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
                  type="submit"
                  className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800"
                >
                  Comment
                </button>
              </form>
            </div>
          </div>
        ))
      )}
    </div>
  );
});

export default Posts;
