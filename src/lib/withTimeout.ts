export async function withTimeout<T>(
  queryFn: (signal: AbortSignal) => Promise<T>,
  ms = 5000
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await queryFn(controller.signal);
  } finally {
    clearTimeout(id);
  }
}
