import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface PageData {
  id: number;
  slug: string;
  title: string;
  content_html: string;
}

interface Props {
  page: PageData | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug as string;

  try {
    const page = await apiFetch<PageData>(`/pages/${slug}`, { isServer: true });
    return { props: { page } };
  } catch {
    return { props: { page: null } };
  }
};

export default function CompanyPage({ page }: Props) {
  if (!page) {
    return (
      <>
        <Head><title>페이지를 찾을 수 없습니다 - YES24</title></Head>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: 80, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 20 }}>요청하신 페이지를 찾을 수 없습니다.</p>
          <Link href="/" style={{
            display: 'inline-block', padding: '10px 24px', fontSize: 13,
            color: '#fff', background: '#0080ff', borderRadius: 2, textDecoration: 'none',
          }}>
            홈으로 이동
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>{page.title} - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span>{page.title}</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 24 }}>
          {page.title}
        </h2>

        <div
          dangerouslySetInnerHTML={{ __html: page.content_html }}
          style={{
            fontSize: 13, lineHeight: 1.8, color: '#333',
            marginBottom: 40,
          }}
        />
      </div>
    </>
  );
}
