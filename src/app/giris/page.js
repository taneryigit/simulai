'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GirisPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidBrowser, setIsValidBrowser] = useState(true);
  const router = useRouter();

  useEffect(() => {
    function checkSafariBrowser() {
      // Only run this check on the client side
      if (typeof window !== 'undefined') {
        const userAgent = navigator.userAgent;
        
        // Check if it's an iOS device (iPhone, iPad, iPod)
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        
        // Check if it's NOT Safari (CriOS = Chrome on iOS, FxiOS = Firefox on iOS)
        const isNotSafari = /CriOS|Chrome|FxiOS|OPiOS|EdgiOS/.test(userAgent);
        
        if (isIOS && isNotSafari) {
          // Set state
          setIsValidBrowser(false);
          
          // Show alert
          alert("Bu uygulamayı kullanmak için lütfen Safari tarayıcısını kullanın.");
               
        }
      }
    }

    checkSafariBrowser();
  }, []);

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
            localStorage.removeItem('user'); // Clear previous user data
            localStorage.setItem('user', JSON.stringify({
                id: data.id,
                firstname: data.firstname,
                lastname: data.lastname,
                companyid: data.companyid,
            }));

            window.dispatchEvent(new Event("storage")); // Force update across tabs

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
            disabled={isLoading || !isValidBrowser}
            style={{
              backgroundColor: '#24475a',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: isValidBrowser ? 'pointer' : 'not-allowed',
              width: '100%',
              fontSize: '16px',
              fontWeight: '500',
              opacity: isValidBrowser ? 1 : 0.5
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
       padding: '12px',  /* General padding */
       paddingBottom: '10px', /* Moves text 10px up */
       backgroundColor: 'rgba(234, 234, 233, 0.939)',
       position: 'fixed',
       bottom: '0', /* Ensures footer sticks to bottom */
       left: '0',
       width: '100%',
       height: 'auto',
       minHeight: '50px',
       fontSize: '1em',
       color: 'black'
      }}>
        © 2025 Tüm hakları SimulAI Teknoloji şirketine aittir.
      </footer>
    </div>
  );
}