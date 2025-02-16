//src/app/giris/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GirisPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
          id: data.id,
          firstname: data.firstname,
          lastname: data.lastname,
          companyid: data.companyid,
        }));
        router.push('/panel'); // Redirect after login
      } else {
        throw new Error(data.error || 'Giriş başarısız');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      style={{
        background: '#FFFFFF',
        margin: 0,
        fontFamily: "'Open Sans', sans-serif",
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundImage: `url('/images/background/background_nologo.jpg')`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'contain'
      }}
      
    >
      <div 
        style={{
          backgroundColor: 'rgba(234, 234, 233, 0.939)',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#000', fontWeight: 'bold', fontSize: '24px' }}>SimulAI</h2>
          <p style={{ color: '#000', fontSize: '16px' }}>Lütfen Giriş Yapınız</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="email" style={{ fontWeight: 'bold', color: '#000' }}>E-posta</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e1e1e1',
                backgroundColor: '#f8f9fa',
                color: '#000'
              }}
              placeholder="E-posta adresinizi girin"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password" style={{ fontWeight: 'bold', color: '#000' }}>Şifre</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e1e1e1',
                backgroundColor: '#f8f9fa',
                color: '#000'
              }}
              placeholder="Şifrenizi girin"
            />
          </div>

          {error && (
            <div style={{ color: '#dc3545', marginBottom: '15px', textAlign: 'center', padding: '10px', backgroundColor: '#f8d7da', borderRadius: '5px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              backgroundColor: '#24475a',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a href="/new-password" style={{ color: '#000', textDecoration: 'none', fontSize: '14px' }}>Yeni Şifre Al</a>
          </div>
        </form>
      </div>
      <footer style={{
  textAlign: 'center',
  padding: '4px',
  backgroundColor: 'rgba(234, 234, 233, 0.939)',
  position: 'fixed',
  bottom: 0,
  width: '100%',
  fontSize: '0.8em',
 color: 'black'
}}>
  © 2025 Tüm hakları SimulAI Teknoloji şirketine aittir.
</footer>


    </div>
    
  );
}
