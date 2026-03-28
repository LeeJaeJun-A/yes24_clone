import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { EventItem } from '@/lib/types';

interface Props {
  event: EventItem | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const eventno = ctx.params?.eventno as string;
  try {
    const event = await apiFetch<EventItem>(`/events/${eventno}`, { isServer: true });
    return { props: { event } };
  } catch {
    return { props: { event: null } };
  }
};

export default function EventPage({ event }: Props) {
  if (!event) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 80, textAlign: 'center' }}>
        <h2>이벤트를 찾을 수 없습니다</h2>
        <Link href="/main/default.aspx" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-block' }}>
          홈으로 이동
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head><title>{event.title} - YES24</title></Head>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <div className="breadcrumb">
          <Link href="/">HOME</Link> <span>&gt;</span> <span>이벤트</span> <span>&gt;</span> <span>{event.title}</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>{event.title}</h1>
        {event.description && <p style={{ color: '#666', marginBottom: 20 }}>{event.description}</p>}
        {event.content_html && (
          <div dangerouslySetInnerHTML={{ __html: event.content_html }} style={{ lineHeight: 1.8 }} />
        )}
      </div>
    </>
  );
}
