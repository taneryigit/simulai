// src/app/new-password/page.js
'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
 

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleResetRequest = async () => {
    if (!isValidEmail(email)) {
      setMessage('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }
  
    setLoading(true);
    setMessage('');
  
    try {
      const response = await fetch('/api/auth/new-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
  
      // Ensure response is not empty before parsing JSON
      let data;
      try {
        data = await response.json();
      } catch  {
        throw new Error('Sunucudan geçersiz yanıt alındı.');
      }
  
    
  
      if (!response.ok) {
        throw new Error(data.error || 'Sunucu hatası');
      }
  
      setMessage(data.message);
    } catch  {
     
      setMessage(error.message || 'Bir hata oluştu, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };
  
  

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-center text-lg font-bold"> Şifre Al</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 text-center mb-4">
            Şifrenizi almak için e-posta adresinizi giriniz.
          </p>
          <input
            type="email"
            placeholder="E-posta adresiniz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 border rounded mb-4"
          />
          <Button
            onClick={handleResetRequest}
            className="w-full"
            disabled={loading || !email}
          >
            {loading ? "Gönderiliyor..." : "Şifre Bağlantısı Gönder"}
          </Button>
          {message && <p className="mt-4 text-center text-sm text-gray-700">{message}</p>}
        </CardContent>
      </Card>
      <div className="text-center mt-4">
        <a href="/giris" className="text-blue-600 hover:underline text-sm">Giriş Sayfasına Dön</a>
      </div>
    </div>
  );
}

