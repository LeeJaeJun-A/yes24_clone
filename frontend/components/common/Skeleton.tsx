const shimmer = `
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
`;

function SkeletonBox({ width, height, style }: { width?: string | number; height?: string | number; style?: React.CSSProperties }) {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{
        width: width || '100%',
        height: height || 16,
        borderRadius: 3,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200px 100%',
        animation: 'shimmer 1.5s infinite linear',
        ...style,
      }} />
    </>
  );
}

export function ProductCardSkeleton() {
  return (
    <div style={{ textAlign: 'center' }}>
      <SkeletonBox height={200} style={{ marginBottom: 10 }} />
      <SkeletonBox height={14} style={{ marginBottom: 6 }} />
      <SkeletonBox width="60%" height={12} style={{ margin: '0 auto', marginBottom: 6 }} />
      <SkeletonBox width="40%" height={14} style={{ margin: '0 auto' }} />
    </div>
  );
}

export function ProductListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RankedListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid #ebebeb' }}>
          <SkeletonBox width={40} height={40} />
          <SkeletonBox width={70} height={100} />
          <div style={{ flex: 1 }}>
            <SkeletonBox height={16} style={{ marginBottom: 8 }} />
            <SkeletonBox width="60%" height={12} style={{ marginBottom: 8 }} />
            <SkeletonBox width="30%" height={14} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div>
      <SkeletonBox height={40} style={{ marginBottom: 2, borderRadius: 0 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBox key={j} height={36} style={{ flex: 1, borderRadius: 0 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default SkeletonBox;
