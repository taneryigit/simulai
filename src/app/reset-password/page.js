'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Şifre en az bir büyük harf ve bir rakam içermelidir.');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!token) {
        setMessage('Geçersiz veya eksik bağlantı bilgisi.');
    }
  }, [token]);

  const isValidPassword = (password) => {
    return /^(?=.*[A-Z])(?=.*\d).+$/.test(password);
  };

  const handlePasswordReset = async () => {
    if (password !== confirmPassword) {
      setMessage('Şifreler eşleşmiyor.');
      return;
    }

    if (!isValidPassword(password)) {
      setMessage('Şifre en az bir büyük harf ve bir rakam içermelidir.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bir hata oluştu');
      }

      setMessage('Şifre başarıyla değiştirildi! Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => {
        router.push('/giris');
      }, 3000);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
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
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}