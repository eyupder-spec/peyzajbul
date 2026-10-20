import { supabase } from "@/lib/supabase/client";

/**
 * Fiyatlandırma/panel migration'larıyla gelen tablo ve RPC'ler için tipsiz erişim.
 * src/lib/supabase/types.ts migration'lar uygulandıktan sonra yeniden üretilene kadar bu
 * çağrılar tipli istemciden geçemez; her çağrı sonucu burada yerel arayüzlere indirgenir.
 */

export interface RpcError {
  message: string;
  code?: string;
}

interface UntypedResult {
  data: unknown;
  error: RpcError | null;
}

export interface UntypedQuery extends PromiseLike<UntypedResult> {
  select(columns: string): UntypedQuery;
  insert(values: unknown): UntypedQuery;
  eq(column: string, value: unknown): UntypedQuery;
  gte(column: string, value: unknown): UntypedQuery;
  lte(column: string, value: unknown): UntypedQuery;
  order(column: string, options?: { ascending?: boolean }): UntypedQuery;
  limit(count: number): UntypedQuery;
}

interface UntypedClient {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<UntypedResult>;
  from(table: string): UntypedQuery;
}

const untyped = supabase as unknown as UntypedClient;

export interface DbResult<T> {
  data: T | null;
  error: RpcError | null;
}

function failure(error: unknown): RpcError {
  return { message: error instanceof Error ? error.message : String(error) };
}

/** RPC çağrısı; hata fırlatmaz, `{ data, error }` döner. */
export async function callRpc<T>(fn: string, args?: Record<string, unknown>): Promise<DbResult<T>> {
  try {
    const { data, error } = await untyped.rpc(fn, args);
    return error ? { data: null, error } : { data: data as T, error: null };
  } catch (error) {
    return { data: null, error: failure(error) };
  }
}

/** Tablo/görünüm sorgusu; hata fırlatmaz, `{ data, error }` döner. */
export async function queryUntyped<T>(
  table: string,
  build: (query: UntypedQuery) => PromiseLike<UntypedResult>,
): Promise<DbResult<T>> {
  try {
    const { data, error } = await build(untyped.from(table));
    return error ? { data: null, error } : { data: data as T, error: null };
  } catch (error) {
    return { data: null, error: failure(error) };
  }
}

export interface FunctionFailure {
  message: string;
  code?: string;
}

const NETWORK_MESSAGE = "Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.";
const GENERIC_MESSAGE = "İşlem tamamlanamadı, lütfen tekrar deneyin.";

/** Edge function'ın 4xx/5xx gövdesindeki Türkçe `error` metnini okur (supabase-js genel mesaj verir). */
async function readHttpFailure(error: unknown): Promise<FunctionFailure> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body: unknown = await context.clone().json();
      const record = body as { error?: unknown; code?: unknown } | null;
      if (record && typeof record.error === "string" && record.error) {
        return { message: record.error, code: typeof record.code === "string" ? record.code : undefined };
      }
    } catch {
      return { message: GENERIC_MESSAGE };
    }
    return { message: GENERIC_MESSAGE };
  }
  return { message: NETWORK_MESSAGE };
}

export type FunctionResult<T> =
  | { ok: true; data: T }
  | ({ ok: false } & FunctionFailure);

/**
 * Edge function çağrısı. İş mantığı hataları HTTP 200 + `{ error, code }` ile döner (WP04),
 * diğer hatalar 4xx/5xx gövdesindedir; ikisi de aynı Türkçe mesaja indirgenir.
 */
export async function invokeEdgeFunction<T extends object>(
  name: string,
  body: Record<string, unknown>,
): Promise<FunctionResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) return { ok: false, ...(await readHttpFailure(error)) };

    const payload = (data ?? {}) as T & { error?: unknown; code?: unknown };
    if (typeof payload.error === "string" && payload.error) {
      return { ok: false, message: payload.error, code: typeof payload.code === "string" ? payload.code : undefined };
    }
    return { ok: true, data: payload };
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }
}
