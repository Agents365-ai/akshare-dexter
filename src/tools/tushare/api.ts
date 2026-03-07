import { readCache, writeCache, describeRequest } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';

const TUSHARE_API_URL = 'http://api.tushare.pro';

export interface TushareRawResponse {
  fields: string[];
  items: unknown[][] | null;
}

export interface TushareApiResponse {
  data: Record<string, unknown>[];
  url: string;
}

// Convert Tushare tabular { fields, items } to object array
export function transformTushareResponse(raw: TushareRawResponse): Record<string, unknown>[] {
  if (!raw.items || !raw.fields.length) return [];
  return raw.items.map((row) => {
    const obj: Record<string, unknown> = {};
    raw.fields.forEach((field, i) => {
      obj[field] = row[i];
    });
    return obj;
  });
}

export async function callTushare(
  apiName: string,
  params: Record<string, string | number | undefined>,
  fields?: string[],
  options?: { cacheable?: boolean }
): Promise<TushareApiResponse> {
  const label = describeRequest(apiName, params);

  // Check cache first
  if (options?.cacheable) {
    const cached = readCache(apiName, params);
    if (cached) {
      return { data: (cached.data as any).records || [], url: cached.url };
    }
  }

  const token = process.env.TUSHARE_TOKEN;
  if (!token) {
    throw new Error('[Tushare] TUSHARE_TOKEN not set');
  }

  const body: Record<string, unknown> = {
    api_name: apiName,
    token,
    params: Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    ),
  };
  if (fields?.length) {
    body.fields = fields.join(',');
  }

  let response: Response;
  try {
    response = await fetch(TUSHARE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[Tushare] network error: ${label} — ${message}`);
    throw new Error(`[Tushare] request failed for ${label}: ${message}`);
  }

  const json = await response.json().catch(() => {
    throw new Error(`[Tushare] invalid JSON response for ${label}`);
  });

  if (json.code !== 0) {
    const msg = json.msg || `code ${json.code}`;
    logger.error(`[Tushare] API error: ${label} — ${msg}`);
    throw new Error(`[Tushare] ${msg} (api: ${apiName})`);
  }

  const records = transformTushareResponse(json.data || { fields: [], items: null });
  const url = `tushare://${apiName}?${Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join('&')}`;

  // Cache if requested
  if (options?.cacheable) {
    writeCache(apiName, params, { records } as any, url);
  }

  return { data: records, url };
}
