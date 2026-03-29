import Head from 'next/head';
import MypageLayout from '@/components/layout/MypageLayout';
import { useState } from 'react';

export default function EditInfoPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  return (
    <MypageLayout title="내 정보 수정">
      <Head><title>내 정보 수정 - YES24</title></Head>
      <div style={{ maxWidth: 500 }}>
        {[
          { label: '이름', value: name, setter: setName, placeholder: '이름을 입력하세요', type: 'text' },
          { label: '이메일', value: email, setter: setEmail, placeholder: '이메일을 입력하세요', type: 'email' },
          { label: '휴대폰', value: phone, setter: setPhone, placeholder: '010-0000-0000', type: 'tel' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 6 }}>{f.label}</label>
            <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)}
              placeholder={f.placeholder}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 3, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 6 }}>새 비밀번호</label>
          <input type="password" placeholder="변경할 비밀번호 입력"
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 3, fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }} />
          <input type="password" placeholder="비밀번호 확인"
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 3, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <button style={{ width: '100%', padding: '12px', background: '#0080ff', color: '#fff', border: 'none', borderRadius: 3, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          저장하기
        </button>
      </div>
    </MypageLayout>
  );
}
