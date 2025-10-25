import { NextRequest } from 'next/server';

/**
 * 统一从请求头提取客户端标识（IP）。
 * Vercel 会在 `x-forwarded-for` 中附带真实 IP，必要时退回其他头或 host。
 */
export function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip');
  if (realIp) {
    return realIp;
  }

  return request.headers.get('host') || 'anonymous';
}
