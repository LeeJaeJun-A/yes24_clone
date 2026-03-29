import React from 'react';
import Link from 'next/link';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          maxWidth: 960, margin: '0 auto', padding: '60px 0', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, color: '#ddd', marginBottom: 20 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 10 }}>
            오류가 발생했습니다
          </h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
            일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              className="btnC btn_blue b_size"
            >
              새로고침
            </button>
            <Link href="/main/default.aspx" className="btnC b_size">
              홈으로
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
