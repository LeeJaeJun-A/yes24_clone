import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'mem' | 'nMem'>('mem');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [orderPw, setOrderPw] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [pwError, setPwError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError(false);
    setPwError(false);

    if (!email) { setEmailError(true); return; }
    if (!password) { setPwError(true); return; }

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push('/main/default.aspx');
      } else {
        const data = await res.json();
        setError(data.detail || '아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setError('서버 오류가 발생했습니다.');
    }
  };

  return (
    <>
      <Head><title>로그인 - YES24</title></Head>

      {/* Simplified header */}
      <div style={{ borderBottom: '1px solid #d8d8d8', background: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <Link href="/main/default.aspx">
              <img src="https://image.yes24.com/sysimage/renew/gnb/logoN4.svg" alt="YES24" style={{ height: 36 }}
                onError={(e) => { (e.target as HTMLImageElement).style.cssText = 'font-size:24px;font-weight:900;color:#0080ff;'; (e.target as HTMLImageElement).alt = 'YES24'; }}
              />
            </Link>
            <span style={{ fontSize: 18, fontWeight: 500, color: '#333' }}>로그인</span>
          </div>
          <Link href="/Member/Join/Accept" className="btnC m_size btn_blue" style={{ width: 80 }}>회원가입</Link>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 20px' }}>
        {/* Tabs */}
        <div className="yesTab_nor yesTab_blue" style={{ marginBottom: 25 }}>
          <ul style={{ display: 'flex' }}>
            <li className={activeTab === 'mem' ? 'on' : ''} style={{ flex: 1 }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('mem'); }}
                style={{
                  display: 'block', padding: '12px 0', textAlign: 'center', fontSize: 14,
                  background: activeTab === 'mem' ? '#0080ff' : '#f8f8f8',
                  color: activeTab === 'mem' ? '#fff' : '#333',
                  fontWeight: activeTab === 'mem' ? 700 : 400,
                  border: '1px solid #d8d8d8', borderBottom: 'none', textDecoration: 'none',
                }}>회원</a>
            </li>
            <li className={activeTab === 'nMem' ? 'on' : ''} style={{ flex: 1 }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('nMem'); }}
                style={{
                  display: 'block', padding: '12px 0', textAlign: 'center', fontSize: 14,
                  background: activeTab === 'nMem' ? '#0080ff' : '#f8f8f8',
                  color: activeTab === 'nMem' ? '#fff' : '#333',
                  fontWeight: activeTab === 'nMem' ? 700 : 400,
                  border: '1px solid #d8d8d8', borderBottom: 'none', textDecoration: 'none',
                }}>비회원 주문확인</a>
            </li>
          </ul>
        </div>

        {/* Member login */}
        {activeTab === 'mem' && (
          <form onSubmit={handleLogin}>
            <input type="hidden" name="__VIEWSTATE" value="/wEPDwULLTE2MTY2ODcyMjk=" />
            <input type="hidden" name="LoginType" value="" />
            <input type="hidden" name="AutoLogin" value="1" />

            <div className={`yesIpt b_size focus_blue ${emailError ? 'error' : ''}`}>
              <input
                type="text" id="SMemberID" placeholder="아이디"
                value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                maxLength={100}
              />
            </div>
            {emailError && <p className="yesFormTxt error" style={{ display: 'block' }}>아이디를 입력해주세요.</p>}

            <div className={`yesIpt b_size focus_blue mgt10 ${pwError ? 'error' : ''}`}>
              <input
                type="password" id="SMemberPassword" placeholder="비밀번호"
                value={password} onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
                maxLength={30}
              />
            </div>
            {pwError && <p className="yesFormTxt error" style={{ display: 'block' }}>비밀번호를 입력해주세요.</p>}

            <div style={{ margin: '12px 0', display: 'flex', gap: 20 }}>
              <label className="yesChk" style={{ cursor: 'pointer' }}>
                <input type="checkbox" style={{ marginRight: 4, verticalAlign: 'middle', width: 'auto' }} />
                로그인 상태 유지
              </label>
              <label className="yesChk" style={{ cursor: 'pointer' }}>
                <input type="checkbox" style={{ marginRight: 4, verticalAlign: 'middle', width: 'auto' }} />
                아이디 저장
              </label>
            </div>

            {error && <div style={{ color: '#ff6666', fontSize: 12, marginBottom: 10 }}>{error}</div>}

            <button type="submit" className="btnC btn_blue xb_size" style={{ width: '100%', marginBottom: 15 }}>
              <span className="bWrap"><em className="txt">로그인</em></span>
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, fontSize: 12, color: '#666' }}>
              <Link href="#" style={{ color: '#666' }}>아이디 찾기</Link>
              <span className="divi" style={{ display: 'inline-block', width: 1, height: 10, background: '#ddd', verticalAlign: 'middle' }} />
              <Link href="#" style={{ color: '#666' }}>비밀번호 찾기</Link>
            </div>

            {/* Social login */}
            <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #ebebeb' }}>
              <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 12 }}>소셜 계정으로 로그인</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { name: '네이버', bg: '#03c75a', color: '#fff', icon: 'N' },
                  { name: '카카오', bg: '#fee500', color: '#3c1e1e', icon: 'K' },
                  { name: '페이스북', bg: '#1877f2', color: '#fff', icon: 'f' },
                  { name: '휴대폰', bg: '#f8f8f8', color: '#333', icon: '📱' },
                ].map(s => (
                  <button key={s.name} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 15px',
                    background: s.bg, color: s.color, border: '1px solid #ddd',
                    borderRadius: 3, fontSize: 13, cursor: 'pointer',
                  }}>
                    <span style={{ width: 20, textAlign: 'center', fontWeight: 700 }}>{s.icon}</span>
                    <span>{s.name} 로그인</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* Non-member order check */}
        {activeTab === 'nMem' && (
          <div>
            <input type="hidden" name="__VIEWSTATE" value="/wEPDwULLTE2MTY2ODcyMjk=" />
            <input type="hidden" name="__EVENTVALIDATION" value="/wEdAAQ=" />
            <div className="yesIpt b_size focus_blue">
              <input type="text" placeholder="주문번호" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} maxLength={25} />
            </div>
            <div className="yesIpt b_size focus_blue mgt10">
              <input type="password" placeholder="비밀번호" value={orderPw} onChange={(e) => setOrderPw(e.target.value)} maxLength={16} />
            </div>
            <button className="btnC btn_blue xb_size" style={{ width: '100%', marginTop: 15 }} onClick={() => alert('비회원 주문 확인 기능은 준비 중입니다.')}>
              <span className="bWrap"><em className="txt">확인</em></span>
            </button>
          </div>
        )}

        {/* Test account info */}
        <div style={{ marginTop: 30, padding: 15, background: '#f8f8f8', borderRadius: 3, fontSize: 12, color: '#666', border: '1px solid #ebebeb' }}>
          <p style={{ fontWeight: 700, marginBottom: 4, color: '#333' }}>테스트 계정</p>
          <p>아이디: user1@yes24clone.com</p>
          <p>비밀번호: test1234</p>
        </div>
      </div>

      {/* Simple footer */}
      <div style={{ borderTop: '1px solid #d8d8d8', marginTop: 60, padding: 20, textAlign: 'center', fontSize: 11, color: '#999' }}>
        Copyright © YES24 Corp. All Rights Reserved.
      </div>
    </>
  );
}
