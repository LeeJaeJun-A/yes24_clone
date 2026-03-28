import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', username: '', password: '', password2: '', phone: '' });
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError('이용약관에 동의해 주세요.'); return; }
    if (form.password !== form.password2) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (form.password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, username: form.username, password: form.password, phone: form.phone }),
      });
      if (res.ok) { router.push('/main/default.aspx'); }
      else {
        const data = await res.json();
        setError(data.detail || '회원가입에 실패했습니다.');
      }
    } catch { setError('서버 오류가 발생했습니다.'); }
  };

  return (
    <>
      <Head><title>회원가입 - YES24</title></Head>
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span style={{ color: '#333' }}>회원가입</span>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '30px 0' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#333', textAlign: 'center', marginBottom: 30, paddingBottom: 15, borderBottom: '2px solid #333' }}>
          회원가입
        </h2>

        <form onSubmit={handleSubmit}>
          <input type="hidden" name="__VIEWSTATE" value="/wEPDwULLTE2MTY2ODcyMjk=" />
          <input type="hidden" name="csrf_token" value="a1b2c3d4e5f6" />

          {[
            { key: 'email', label: '이메일 (아이디)', type: 'email', placeholder: '이메일을 입력해 주세요', required: true },
            { key: 'username', label: '이름', type: 'text', placeholder: '이름을 입력해 주세요', required: true },
            { key: 'password', label: '비밀번호', type: 'password', placeholder: '비밀번호 (6자 이상)', required: true },
            { key: 'password2', label: '비밀번호 확인', type: 'password', placeholder: '비밀번호를 다시 입력해 주세요', required: true },
            { key: 'phone', label: '휴대폰 번호', type: 'tel', placeholder: '010-0000-0000 (선택)', required: false },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                {field.label}
                {field.required && <span style={{ color: '#ff6666', marginLeft: 2 }}>*</span>}
              </label>
              <div className="yesIpt b_size focus_blue">
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </div>
            </div>
          ))}

          {/* Terms */}
          <div style={{ marginTop: 20, marginBottom: 20, padding: 15, background: '#f8f8f8', border: '1px solid #ebebeb', borderRadius: 3 }}>
            <label className="yesChk" style={{ cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 'auto', marginRight: 6, verticalAlign: 'middle' }} />
              <span style={{ fontWeight: 500 }}>이용약관 및 개인정보처리방침에 동의합니다.</span>
              <span style={{ color: '#ff6666', marginLeft: 4 }}>(필수)</span>
            </label>
            <div style={{ marginTop: 10, maxHeight: 100, overflow: 'auto', fontSize: 11, color: '#999', lineHeight: 1.6 }}>
              제1조(목적) 이 약관은 예스이십사 주식회사(이하 "회사")가 운영하는 인터넷 사이트에서 제공하는 서비스의 이용 조건 및 절차에 관한 기본 사항을 규정함을 목적으로 합니다.
              제2조(정의) "서비스"란 회사가 운영하는 사이트를 통하여 개인이 상품 등을 구매할 수 있도록 제공하는 서비스를 말합니다.
            </div>
          </div>

          {error && <div style={{ color: '#ff6666', fontSize: 12, marginBottom: 12 }}>{error}</div>}

          <button type="submit" className="btnC btn_blue xb_size" style={{ width: '100%' }}>
            <span className="bWrap"><em className="txt">회원가입</em></span>
          </button>
        </form>
      </div>
    </>
  );
}
