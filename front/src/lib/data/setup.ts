export default async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit,
  headers?: Record<string, string>
): Promise<JSON> {
  const res = await fetch(input, { ...init, ...headers });
  return res.json();
}
