'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from "next/image";
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Şifre en az 8 karakter olmalı, en az bir büyük harf ve bir rakam içermelidir.');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!token) {
        setMessage('Geçersiz veya eksik bağlantı bilgisi.');
    }
  }, [token]);

  const isValidPassword = (password) => {
    return password.length >= 8 && /^(?=.*[A-Z])(?=.*\d).+$/.test(password);
  };

  const handlePasswordReset = async () => {
    if (password !== confirmPassword) {
      setMessage('Şifreler eşleşmiyor.');
      return;
    }
  
    if (!isValidPassword(password)) {
      setMessage('Şifre en az 8 karakter olmalı, en az bir büyük harf ve bir rakam içermelidir.');
      return;
    }
  
    setLoading(true);
    setMessage('');
  
    try {
      console.log('Starting password reset with token:', token ? 'Token exists' : 'No token');
      
      if (!token) {
        throw new Error('Geçersiz şifre sıfırlama bağlantısı. Lütfen yeni bir bağlantı talep edin.');
      }
  
      const resetData = {
        token,
        password
      };
  
      console.log('Sending reset request...');
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resetData)
      });
  
      const data = await response.json();
      console.log('Response received:', response.status);
  
      if (!response.ok) {
        const errorMessage = data.error || 'Şifre sıfırlama işlemi başarısız oldu.';
        console.error('Reset failed:', errorMessage);
        throw new Error(errorMessage);
      }
  
      console.log('Password reset successful');
      setMessage('Şifre başarıyla değiştirildi! Giriş sayfasına yönlendiriliyorsunuz...');
      
      // Add a small delay before redirect to ensure message is seen
      setTimeout(() => {
        router.push('/giris');
      }, 3000);
  
    } catch (error) {
      console.error('Password reset error:', error);
      setMessage(error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-center text-lg font-bold">Yeni Şifre Belirle</CardTitle>
        </CardHeader>
        <CardContent>
          {message && <p className="text-sm text-red-600 text-center mb-4">{message}</p>}
          <input
            type="password"
            placeholder="Yeni şifreniz"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 border rounded mb-4"
          />
          <input
            type="password"
            placeholder="Şifrenizi tekrar girin"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full p-2 border rounded mb-4"
          />
          <Button
            onClick={handlePasswordReset}
            className="w-full"
            disabled={loading || !password || !confirmPassword}
          >
            {loading ? 'Şifre Değiştiriliyor...' : 'Şifre Belirle'}
          </Button>
        </CardContent>
      </Card>
   
        {/* Background Logos at the Bottom */}
        <div className="absolute bottom-4 left-4">
        <Image src="/images/background/logoleft.png" alt="Left Logo" className="w-32 opacity-50" />
      </div>
      <div className="absolute bottom-4 right-4">
        <Image src="/images/background/logoright.png" alt="Right Logo" className="w-32 opacity-50" />
      </div>  </div>
  );
}
 
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}