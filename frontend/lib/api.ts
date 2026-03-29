const API_INTERNAL = process.env.API_INTERNAL_URL || 'http://localhost:8000/api/v1';
const API_PUBLIC = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function getApiUrl(path: string, isServer = false): string {
  const base = isServer ? API_INTERNAL : API_PUBLIC;
  return `${base}${path}`;
}

export async function apiFetch<T>(path: string, opts?: RequestInit & { isServer?: boolean }): Promise<T> {
  const { isServer, ...fetchOpts } = opts || {};
  const url = getApiUrl(path, isServer);
  const res = await fetch(url, {
    ...fetchOpts,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOpts?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function getCoverUrl(coverImage: string | null | undefined, goodsNo: number): string {
  if (!coverImage || !coverImage.startsWith("http")) {
    return `https://picsum.photos/seed/${goodsNo}/200/280`;
  }
  return coverImage;
}

export async function apiPost<T>(path: string, body: any, opts?: RequestInit): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    ...opts,
  });
}
