import { verifyToken } from '@/lib/auth';

export async function authenticate(req) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Unauthorized: No token provided' };
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return { success: false, error: 'Unauthorized: Invalid token' };
  }

  return { success: true, user: decoded };
}
