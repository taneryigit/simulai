import { authenticate } from '@/middleware/authMiddleware';

export async function GET(req) {
  const authResult = await authenticate(req);

  if (!authResult.success) {
    return Response.json(authResult, { status: 401 });
  }

  return Response.json({ success: true, message: 'Güvenli alana erişildi!', user: authResult.user });
}
