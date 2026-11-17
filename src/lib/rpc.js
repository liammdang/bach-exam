import { isNetworkError } from './errors';

// Gọi RPC, tự thử lại khi lỗi mạng (tối đa `retries` lần, backoff tăng dần)
export async function rpc(db, fn, args = {}, { retries = 2 } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      const { data, error, status } = await db.rpc(fn, args);
      if (error) {
        const e = new Error(error.message || 'RPC error');
        e.status = status;
        e.code = error.code;
        throw e;
      }
      return data;
    } catch (err) {
      if (attempt < retries && isNetworkError(err)) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
        continue;
      }
      throw err;
    }
  }
}
