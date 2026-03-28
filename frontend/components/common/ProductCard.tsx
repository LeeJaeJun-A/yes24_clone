import Link from 'next/link';
import { useRouter } from 'next/router';
import { Product } from '@/lib/types';
import { getImageUrl, formatPrice } from '@/lib/constants';

interface Props {
  product: Product;
  rank?: number;
  listView?: boolean;
  showCheckbox?: boolean;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(Number(rating));
  return (
    <span style={{ color: '#ffb800', fontSize: 11, letterSpacing: -1 }}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  );
}

export default function ProductCard({ product, rank, listView, showCheckbox }: Props) {
  const router = useRouter();

  const directOrder = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/checkout/direct-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goods_no: product.goods_no, quantity: 1 }),
      });
      const data = await res.json();
      router.push(`/Order/Confirm?order_no=${data.order_no}`);
    } catch { alert('로그인이 필요합니다.'); }
  };

  const addToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    fetch('/api/v1/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, quantity: 1 }),
    }).then(() => alert('카트에 넣었습니다.')).catch(() => alert('로그인이 필요합니다.'));
  };

  if (listView) {
    return (
      <li className="itemUnit" style={{ display: 'flex', gap: 20, padding: '20px 0', borderBottom: '1px solid #ebebeb' }} data-goods-no={product.goods_no}>
        {/* Image */}
        <div className="item_img" style={{ width: 120, flexShrink: 0, position: 'relative' }}>
          {rank !== undefined && <em className="ico rank">{rank}</em>}
          <Link href={`/Product/Goods/${product.goods_no}`}>
            <span className="img_bdr" style={{ display: 'block', border: '1px solid #ebebeb' }}>
              <img src={getImageUrl(product.cover_image)} alt={product.title} style={{ width: '100%', display: 'block' }} loading="lazy" />
            </span>
          </Link>
        </div>
        {/* Info */}
        <div className="item_info" style={{ flex: 1, minWidth: 0 }}>
          {product.tags && product.tags.length > 0 && (
            <div className="info_row info_keynote" style={{ marginBottom: 4 }}>
              {product.tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="iconC accent" style={{ marginRight: 4 }}><em className="txt">{tag}</em></span>
              ))}
            </div>
          )}
          <div className="info_row info_name" style={{ marginBottom: 6 }}>
            <span style={{ color: '#999', fontSize: 11 }}>[도서] </span>
            <Link href={`/Product/Goods/${product.goods_no}`} className="gd_name" style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
              {product.title}
            </Link>
          </div>
          <div className="info_row info_pubGrp" style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>
            <span>{product.author} 저</span>
            <span className="divi" style={{ display: 'inline-block', width: 1, height: 10, background: '#ddd', margin: '0 8px', verticalAlign: 'middle' }} />
            <span>{product.publisher}</span>
            <span className="divi" style={{ display: 'inline-block', width: 1, height: 10, background: '#ddd', margin: '0 8px', verticalAlign: 'middle' }} />
            <span>{product.publish_date}</span>
          </div>
          <div className="info_row info_price" style={{ marginBottom: 6 }}>
            {product.discount_rate > 0 && (
              <span className="txt_sale"><em className="num">{product.discount_rate}</em>%</span>
            )}
            <strong className="txt_num" style={{ fontSize: 16 }}>
              <em className="yes_b">{product.sale_price.toLocaleString()}</em>원
            </strong>
            {product.discount_rate > 0 && (
              <span className="txt_num dash" style={{ fontSize: 12 }}>
                <em className="yes_m">{product.original_price.toLocaleString()}</em>원
              </span>
            )}
            <span className="yPoint">
              {Math.floor(product.sale_price * 0.05).toLocaleString()}원
            </span>
          </div>
          <div className="info_row info_rating" style={{ fontSize: 11, color: '#999' }}>
            <span className="saleNum" style={{ marginRight: 10 }}>
              판매지수 {product.sales_index.toLocaleString()}
            </span>
            {product.review_count > 0 && (
              <>
                <span style={{ marginRight: 6 }}>
                  <Stars rating={Number(product.rating_avg)} />
                  <em className="yes_b" style={{ marginLeft: 3, color: '#333' }}>{Number(product.rating_avg).toFixed(1)}</em>
                </span>
                <span>
                  회원리뷰(<em className="txC_blue">{product.review_count}</em>건)
                </span>
              </>
            )}
          </div>
        </div>
        {/* Action buttons */}
        <div className="item_btnCol" style={{ width: 100, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch' }}>
          <a className="btnC btn_blue m_size" onClick={addToCart} style={{ cursor: 'pointer', display: 'flex', width: '100%' }}>카트에 넣기</a>
          <a className="btnC btn_sBlue m_size" onClick={directOrder} style={{ cursor: 'pointer', display: 'flex', width: '100%' }}>바로구매</a>
        </div>
      </li>
    );
  }

  // Thumbnail/grid view
  return (
    <div className="itemUnit" style={{ textAlign: 'center', position: 'relative' }} data-goods-no={product.goods_no}>
      <div className="item_img" style={{ position: 'relative', marginBottom: 10 }}>
        {rank !== undefined && <em className="ico rank">{rank}</em>}
        <Link href={`/Product/Goods/${product.goods_no}`}>
          <span className="img_bdr" style={{ display: 'block', border: '1px solid #ebebeb' }}>
            <img src={getImageUrl(product.cover_image)} alt={product.title} style={{ width: '100%', display: 'block' }} loading="lazy" />
          </span>
        </Link>
      </div>
      <div className="item_info" style={{ textAlign: 'left' }}>
        <div className="info_row info_name" style={{ marginBottom: 4 }}>
          <Link href={`/Product/Goods/${product.goods_no}`} className="gd_name" style={{ fontSize: 12, color: '#333', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
            {product.title}
          </Link>
        </div>
        <div className="info_row info_pubGrp" style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
          <span>{product.author}</span>
        </div>
        <div className="info_row info_price">
          {product.discount_rate > 0 && (
            <span className="txt_sale" style={{ fontSize: 12 }}><em className="num">{product.discount_rate}</em>%</span>
          )}
          <strong className="txt_num" style={{ fontSize: 14 }}>
            <em className="yes_b">{product.sale_price.toLocaleString()}</em>원
          </strong>
        </div>
        {product.review_count > 0 && (
          <div className="info_row info_rating" style={{ fontSize: 11, color: '#999', marginTop: 3 }}>
            <Stars rating={Number(product.rating_avg)} />
            <span style={{ marginLeft: 3 }}>({product.review_count})</span>
          </div>
        )}
      </div>
    </div>
  );
}
