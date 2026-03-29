import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth';

type Step = 'terms' | 'form' | 'done';

export default function RegisterPage() {
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const [step, setStep] = useState<Step>('terms');
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeService, setAgreeService] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '', password2: '', phone: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleAgreeAll = (checked: boolean) => {
    setAgreeAll(checked);
    setAgreeService(checked);
    setAgreePrivacy(checked);
    setAgreeMarketing(checked);
  };

  const canProceed = agreeService && agreePrivacy;

  const validateField = (key: string, value: string): string => {
    switch (key) {
      case 'email':
        if (!value) return '이메일을 입력해 주세요.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '올바른 이메일 형식을 입력해 주세요.';
        return '';
      case 'username':
        if (!value) return '이름을 입력해 주세요.';
        if (value.length < 2) return '이름은 2자 이상이어야 합니다.';
        return '';
      case 'password':
        if (!value) return '비밀번호를 입력해 주세요.';
        if (value.length < 6) return '비밀번호는 6자 이상이어야 합니다.';
        if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) return '비밀번호는 영문과 숫자를 포함해야 합니다.';
        return '';
      case 'password2':
        if (!value) return '비밀번호 확인을 입력해 주세요.';
        if (value !== form.password) return '비밀번호가 일치하지 않습니다.';
        return '';
      case 'phone':
        if (value && !/^01[016789]-?\d{3,4}-?\d{4}$/.test(value)) return '올바른 휴대폰 번호를 입력해 주세요.';
        return '';
      default:
        return '';
    }
  };

  const handleFieldBlur = (key: string) => {
    const err = validateField(key, form[key as keyof typeof form]);
    setFieldErrors(prev => ({ ...prev, [key]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    const errors: Record<string, string> = {};
    for (const key of ['email', 'username', 'password', 'password2', 'phone']) {
      const err = validateField(key, form[key as keyof typeof form]);
      if (err) errors[key] = err;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, username: form.username, password: form.password, phone: form.phone || undefined }),
      });
      if (res.ok) {
        // Auto-login after successful registration
        await authLogin(form.email, form.password);
        setStep('done');
      } else {
        const data = await res.json();
        setError(data.detail || '회원가입에 실패했습니다.');
      }
    } catch { setError('서버 오류가 발생했습니다.'); }
    setSubmitting(false);
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

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '30px 20px 60px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#333', textAlign: 'center', marginBottom: 30, paddingBottom: 15, borderBottom: '2px solid #333' }}>
          회원가입
        </h2>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30, gap: 0 }}>
          {[
            { key: 'terms', label: '01 약관동의' },
            { key: 'form', label: '02 정보입력' },
            { key: 'done', label: '03 가입완료' },
          ].map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px',
                background: step === s.key ? '#e51937' : '#f8f8f8',
                color: step === s.key ? '#fff' : '#999',
                fontSize: 13, fontWeight: step === s.key ? 600 : 400,
                borderRadius: 20,
              }}>
                {s.label}
              </div>
              {i < 2 && <span style={{ margin: '0 8px', color: '#ddd' }}>&gt;</span>}
            </div>
          ))}
        </div>

        {/* Step 1: Terms */}
        {step === 'terms' && (
          <div>
            <div style={{ marginBottom: 20, padding: 15, background: '#f0f4ff', border: '1px solid #d0dcf0', borderRadius: 3 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                <input type="checkbox" checked={agreeAll} onChange={e => handleAgreeAll(e.target.checked)} style={{ width: 'auto' }} />
                모든 약관에 동의합니다.
              </label>
            </div>

            {/* Service terms */}
            <div style={{ marginBottom: 15, border: '1px solid #ebebeb', borderRadius: 3 }}>
              <div style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ebebeb' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={agreeService} onChange={e => { setAgreeService(e.target.checked); if (!e.target.checked) setAgreeAll(false); }} style={{ width: 'auto' }} />
                  <span style={{ fontWeight: 500 }}>이용약관 동의</span>
                  <span style={{ color: '#e51937', fontSize: 12 }}>(필수)</span>
                </label>
              </div>
              <div style={{ maxHeight: 120, overflow: 'auto', padding: 15, fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                제1조(목적) 이 약관은 예스이십사 주식회사(이하 &quot;회사&quot;)가 운영하는 인터넷 사이트(이하 &quot;사이트&quot;)에서 제공하는 인터넷 관련 서비스(이하 &quot;서비스&quot;)를 이용함에 있어 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.<br/><br/>
                제2조(정의) &quot;서비스&quot;란 회사가 운영하는 사이트를 통하여 개인이 도서 및 기타 상품 등을 거래할 수 있도록 회사가 제공하는 전자상거래 관련 서비스 및 이에 부수하는 서비스를 말합니다.<br/><br/>
                제3조(약관의 명시와 개정) 회사는 이 약관의 내용을 서비스 초기 화면에 게시합니다. 회사는 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
              </div>
            </div>

            {/* Privacy terms */}
            <div style={{ marginBottom: 15, border: '1px solid #ebebeb', borderRadius: 3 }}>
              <div style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ebebeb' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={agreePrivacy} onChange={e => { setAgreePrivacy(e.target.checked); if (!e.target.checked) setAgreeAll(false); }} style={{ width: 'auto' }} />
                  <span style={{ fontWeight: 500 }}>개인정보 수집 및 이용 동의</span>
                  <span style={{ color: '#e51937', fontSize: 12 }}>(필수)</span>
                </label>
              </div>
              <div style={{ maxHeight: 120, overflow: 'auto', padding: 15, fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                수집 항목: 이메일, 이름, 비밀번호, 휴대폰 번호(선택)<br/>
                수집 목적: 회원 식별, 서비스 제공, 주문/결제 처리, 고객 지원<br/>
                보유 기간: 회원 탈퇴 시까지 (법률에 의해 보존할 필요가 있는 경우 관련 법률에 따름)<br/><br/>
                이용자는 개인정보 수집 및 이용에 동의하지 않을 수 있으나, 동의 거부 시 서비스 이용이 제한됩니다.
              </div>
            </div>

            {/* Marketing terms */}
            <div style={{ marginBottom: 25, border: '1px solid #ebebeb', borderRadius: 3 }}>
              <div style={{ padding: '12px 15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={agreeMarketing} onChange={e => { setAgreeMarketing(e.target.checked); if (!e.target.checked) setAgreeAll(false); }} style={{ width: 'auto' }} />
                  <span style={{ fontWeight: 500 }}>마케팅 정보 수신 동의</span>
                  <span style={{ color: '#999', fontSize: 12 }}>(선택)</span>
                </label>
              </div>
            </div>

            <button
              className="btnC btn_blue xb_size"
              style={{ width: '100%', opacity: canProceed ? 1 : 0.5 }}
              disabled={!canProceed}
              onClick={() => setStep('form')}
            >
              <span className="bWrap"><em className="txt">다음 단계</em></span>
            </button>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 'form' && (
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="__VIEWSTATE" value="/wEPDwULLTE2MTY2ODcyMjk=" />

            {[
              { key: 'email', label: '이메일 (아이디)', type: 'email', placeholder: '이메일을 입력해 주세요', required: true },
              { key: 'username', label: '이름', type: 'text', placeholder: '이름을 입력해 주세요', required: true },
              { key: 'password', label: '비밀번호', type: 'password', placeholder: '영문+숫자 포함 6자 이상', required: true },
              { key: 'password2', label: '비밀번호 확인', type: 'password', placeholder: '비밀번호를 다시 입력해 주세요', required: true },
              { key: 'phone', label: '휴대폰 번호', type: 'tel', placeholder: '010-0000-0000 (선택)', required: false },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  {field.label}
                  {field.required && <span style={{ color: '#e51937', marginLeft: 2 }}>*</span>}
                </label>
                <div className={`yesIpt b_size focus_blue ${fieldErrors[field.key] ? 'error' : ''}`}>
                  <input
                    type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => {
                      setForm({ ...form, [field.key]: e.target.value });
                      if (fieldErrors[field.key]) setFieldErrors(prev => ({ ...prev, [field.key]: '' }));
                    }}
                    onBlur={() => handleFieldBlur(field.key)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                </div>
                {fieldErrors[field.key] && (
                  <p style={{ color: '#e51937', fontSize: 12, marginTop: 4 }}>{fieldErrors[field.key]}</p>
                )}
              </div>
            ))}

            {error && <div style={{ color: '#e51937', fontSize: 12, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" className="btnC xb_size" style={{ flex: 1 }} onClick={() => setStep('terms')}>
                <span className="bWrap"><em className="txt">이전</em></span>
              </button>
              <button type="submit" className="btnC btn_blue xb_size" style={{ flex: 2, opacity: submitting ? 0.6 : 1 }} disabled={submitting}>
                <span className="bWrap"><em className="txt">{submitting ? '가입 중...' : '회원가입'}</em></span>
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: '#e51937',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#333', marginBottom: 12 }}>
              회원가입이 완료되었습니다!
            </h3>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
              YES24의 회원이 되신 것을 환영합니다.
            </p>
            <p style={{ fontSize: 13, color: '#00a651', marginBottom: 30 }}>
              가입 축하 포인트 <strong>5,000P</strong>가 지급되었습니다.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link href="/main/default.aspx" style={{
                display: 'inline-block', padding: '12px 32px', fontSize: 14,
                border: '1px solid #ccc', borderRadius: 2, textDecoration: 'none', color: '#333', background: '#fff',
              }}>
                메인으로
              </Link>
              <Link href="/Templates/FTLogin" style={{
                display: 'inline-block', padding: '12px 32px', fontSize: 14,
                background: '#e51937', color: '#fff', borderRadius: 2, textDecoration: 'none', border: '1px solid #e51937',
              }}>
                로그인
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
