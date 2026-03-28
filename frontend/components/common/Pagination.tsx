import Link from 'next/link';

interface Props {
  page: number;
  pages: number;
  baseUrl: string;
}

export default function Pagination({ page, pages, baseUrl }: Props) {
  if (pages <= 1) return null;

  const sep = baseUrl.includes('?') ? '&' : '?';
  const makeUrl = (p: number) => `${baseUrl}${sep}page=${p}`;

  const blockSize = 10;
  const blockStart = Math.floor((page - 1) / blockSize) * blockSize + 1;
  const blockEnd = Math.min(blockStart + blockSize - 1, pages);
  const pageNums = [];
  for (let i = blockStart; i <= blockEnd; i++) pageNums.push(i);

  return (
    <div className="yesUI_pagen">
      {blockStart > 1 && (
        <>
          <Link href={makeUrl(1)} className="first">맨앞</Link>
          <Link href={makeUrl(blockStart - 1)} className="prev">이전</Link>
        </>
      )}
      {pageNums.map(p => (
        p === page ? (
          <span key={p} className="num on">{p}</span>
        ) : (
          <Link key={p} href={makeUrl(p)} className="num">{p}</Link>
        )
      ))}
      {blockEnd < pages && (
        <>
          <Link href={makeUrl(blockEnd + 1)} className="next">다음</Link>
          <Link href={makeUrl(pages)} className="end">맨끝</Link>
        </>
      )}
    </div>
  );
}
