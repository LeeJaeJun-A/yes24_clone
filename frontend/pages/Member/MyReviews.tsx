import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Review, PaginatedResponse } from '@/lib/types';
import MypageLayout from '@/components/layout/MypageLayout';

interface Props {
  reviews: PaginatedResponse<Review>;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const cookie = ctx.req.headers.cookie || '';
  try {
    const reviews = await apiFetch<PaginatedResponse<Review>>('/reviews/my?page=1&size=20', {
      isServer: true, headers: { cookie },
    });
    return { props: { reviews } };
  } catch {
    return { redirect: { destination: '/Templates/FTLogin', permanent: false } };
  }
};

function Stars({ rating }: { rating: number }) {
  return <span style={{ color: '#ffb800', fontSize: 14 }}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>;
}

export default function MyReviewsPage({ reviews: initialReviews }: Props) {
  const [reviews, setReviews] = useState(initialReviews.items);
  const [editing, setEditing] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const startEdit = (review: Review) => {
    setEditing(review.id);
    setEditRating(review.rating);
    setEditContent(review.content);
    setEditTitle(review.title || '');
  };

  const saveEdit = async (reviewId: number) => {
    try {
      const res = await fetch(`/api/v1/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: editRating, content: editContent, title: editTitle || undefined }),
      });
      if (res.ok) {
        setReviews(reviews.map(r => r.id === reviewId ? { ...r, rating: editRating, content: editContent, title: editTitle } : r));
        setEditing(null);
        alert('리뷰가 수정되었습니다.');
      } else {
        const err = await res.json();
        alert(err.detail || '수정에 실패했습니다.');
      }
    } catch { alert('오류가 발생했습니다.'); }
  };

  const deleteReview = async (reviewId: number) => {
    if (!confirm('리뷰를 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/v1/reviews/${reviewId}`, { method: 'DELETE' });
      setReviews(reviews.filter(r => r.id !== reviewId));
      alert('리뷰가 삭제되었습니다.');
    } catch { alert('삭제에 실패했습니다.'); }
  };

  return (
    <MypageLayout title="내 리뷰">
      <Head><title>내 리뷰 관리 - YES24</title></Head>

        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <p style={{ marginBottom: 15 }}>작성한 리뷰가 없습니다.</p>
            <Link href="/main/default.aspx" className="btnC btn_blue b_size">쇼핑하러 가기</Link>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.id} style={{ padding: '20px 0', borderBottom: '1px solid #ebebeb' }}>
              {editing === review.id ? (
                <div style={{ padding: 16, background: '#f8f8f8', borderRadius: 4 }}>
                  <div style={{ marginBottom: 10 }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setEditRating(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: s <= editRating ? '#ffb800' : '#ddd' }}>
                        {s <= editRating ? '★' : '☆'}
                      </button>
                    ))}
                  </div>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="제목 (선택)" style={{ width: '100%', padding: '8px 10px', border: '1px solid #d8d8d8', borderRadius: 3, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ width: '100%', height: 80, padding: 10, border: '1px solid #d8d8d8', borderRadius: 3, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                  <div style={{ textAlign: 'right', marginTop: 8, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btnC m_size" onClick={() => setEditing(null)}>취소</button>
                    <button className="btnC btn_blue m_size" onClick={() => saveEdit(review.id)}>저장</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <Stars rating={review.rating} />
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                        {review.created_at ? new Date(review.created_at).toLocaleDateString('ko-KR') : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btnC m_size" onClick={() => startEdit(review)} style={{ fontSize: 11 }}>수정</button>
                      <button className="btnC m_size" onClick={() => deleteReview(review.id)} style={{ fontSize: 11 }}>삭제</button>
                    </div>
                  </div>
                  {review.title && <div style={{ fontWeight: 600, fontSize: 14, color: '#333', marginBottom: 6 }}>{review.title}</div>}
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: '#555' }}>{review.content}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>도움이 돼요 ({review.helpful_count ?? review.likes})</div>
                </>
              )}
            </div>
          ))
        )}
    </MypageLayout>
  );
}
