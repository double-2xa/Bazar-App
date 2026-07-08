'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.get('/admin/reviews').then((r) => setReviews(r.data));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    await api.delete(`/reviews/${id}`);
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Reviews</h1>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Product</th><th>User</th><th>Rating</th><th>Comment</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id as string}>
                <td>{(r.product as { name: string })?.name}</td>
                <td>{(r.user as { fullName: string })?.fullName}</td>
                <td>{'⭐'.repeat(r.rating as number)}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.comment as string || '-'}</td>
                <td>{new Date(r.createdAt as string).toLocaleDateString()}</td>
                <td><button className="btn btn-danger" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleDelete(r.id as string)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
