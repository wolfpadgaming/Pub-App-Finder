import { useState, useEffect } from 'react';
import { supabase, Review, ReviewReply } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useReviews(pubId: string | null) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<(Review & { replies: ReviewReply[] })[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadReviews() {
    if (!pubId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles!reviews_user_id_fkey (id, username)
        `)
        .eq('pub_id', pubId)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      const reviewsWithReplies = await Promise.all(
        (reviewsData || []).map(async (review) => {
          const { data: repliesData } = await supabase
            .from('review_replies')
            .select(`
              *,
              profiles!review_replies_user_id_fkey (id, username)
            `)
            .eq('review_id', review.id)
            .order('created_at', { ascending: true });

          return {
            ...review,
            replies: repliesData || []
          };
        })
      );

      setReviews(reviewsWithReplies);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addReview(rating: number, comment: string, photoUrl?: string) {
    if (!user || !pubId) return { success: false, message: 'Please log in to leave a review' };

    try {
      const { error } = await supabase
        .from('reviews')
        .insert([{ pub_id: pubId, user_id: user.id, rating, comment, photo_url: photoUrl }]);

      if (error) throw error;
      await loadReviews();
      return { success: true, message: 'Review posted successfully!' };
    } catch (error) {
      console.error('Error adding review:', error);
      return { success: false, message: 'Failed to post review' };
    }
  }

  async function addReply(reviewId: string, comment: string) {
    if (!user) return { success: false, message: 'Please log in to reply' };

    try {
      const { error } = await supabase
        .from('review_replies')
        .insert([{ review_id: reviewId, user_id: user.id, comment }]);

      if (error) throw error;
      await loadReviews();
      return { success: true, message: 'Reply posted successfully!' };
    } catch (error) {
      console.error('Error adding reply:', error);
      return { success: false, message: 'Failed to post reply' };
    }
  }

  async function deleteReview(reviewId: string) {
    if (!user) return { success: false };

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id);

      if (error) throw error;
      await loadReviews();
      return { success: true };
    } catch (error) {
      console.error('Error deleting review:', error);
      return { success: false };
    }
  }

  useEffect(() => {
    loadReviews();
  }, [pubId, user]);

  return { reviews, loading, addReview, addReply, deleteReview, refreshReviews: loadReviews };
}
