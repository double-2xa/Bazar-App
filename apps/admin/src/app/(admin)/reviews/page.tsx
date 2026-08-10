'use client';

import { useCallback, useEffect, useState } from 'react';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import api from '@/services/api';
import { getApiErrorMessage } from '@/utils/orderDelivery';

type ReviewRow = Record<string, unknown>;

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ReviewRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/admin/reviews').then((response) => setReviews(response.data));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/reviews/${deleteTarget.id as string}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete review.'));
    } finally {
      setDeleting(false);
    }
  };

  const reviewerName = (deleteTarget?.user as { fullName?: string } | undefined)?.fullName;

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Reviews</h1>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Product</th><th>User</th><th>Rating</th><th>Comment</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id as string}>
                <td>{(review.product as { name: string })?.name}</td>
                <td>{(review.user as { fullName: string })?.fullName}</td>
                <td>{'★'.repeat(review.rating as number)}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{review.comment as string || '-'}</td>
                <td>{new Date(review.createdAt as string).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-danger" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => { setError(''); setDeleteTarget(review); }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Delete review?"
        subject={reviewerName ? `review by ${reviewerName}` : 'this review'}
        busy={deleting}
        error={deleteTarget ? error : null}
        confirmLabel="Delete review"
        onCancel={() => { if (!deleting) { setDeleteTarget(null); setError(''); } }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
