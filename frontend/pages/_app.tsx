import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { AuthProvider } from '@/lib/auth';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import '@/styles/globals.css';

const NO_LAYOUT_PAGES = ['/Templates/FTLogin'];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const noLayout = NO_LAYOUT_PAGES.some(p => router.pathname.startsWith(p));

  if (noLayout) {
    return (
      <AuthProvider>
        <ErrorBoundary>
          <Component {...pageProps} />
        </ErrorBoundary>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <Layout categories={pageProps.categories}>
        <ErrorBoundary>
          <Component {...pageProps} />
        </ErrorBoundary>
      </Layout>
    </AuthProvider>
  );
}
