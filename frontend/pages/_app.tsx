import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import '@/styles/globals.css';

const NO_LAYOUT_PAGES = ['/Templates/FTLogin'];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const noLayout = NO_LAYOUT_PAGES.some(p => router.pathname.startsWith(p));

  if (noLayout) {
    return <Component {...pageProps} />;
  }

  return (
    <Layout categories={pageProps.categories}>
      <Component {...pageProps} />
    </Layout>
  );
}
