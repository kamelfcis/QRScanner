/**
 * True when a Supabase read failed because the service could not be reached
 * or rejected the request. An empty successful result is not a failure.
 */
export function isUnavailableReadError(error: unknown): boolean {
  if (error == null) return false;
  if (typeof error === 'string') return isUnavailableMessage(error);
  if (typeof error !== 'object') return false;

  const record = error as Record<string, unknown>;
  const status =
    typeof record.status === 'number'
      ? record.status
      : typeof record.statusCode === 'number'
        ? record.statusCode
        : undefined;

  if (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    (typeof status === 'number' && status >= 500)
  ) {
    return true;
  }

  const code = typeof record.code === 'string' ? record.code : '';
  const name = typeof record.name === 'string' ? record.name : '';
  if (name === 'AbortError' || code === 'ABORT_ERR') return false;

  if (code.startsWith('PGRST') || code === '42501' || /^(401|402|403|5\d\d)$/.test(code)) {
    return true;
  }

  if (name === 'PostgrestError' || name === 'AuthApiError' || name === 'AuthRetryableFetchError') {
    return true;
  }

  const message = typeof record.message === 'string' ? record.message : '';
  if (/aborted/i.test(message)) return false;
  if (isUnavailableMessage(message)) return true;

  // supabase-js `if (error) throw error` throws the JSON body, not an Error instance.
  // HTTP 402 from a restricted project is `{ message: "Service for this project..." }`.
  if (!(error instanceof Error) && message) {
    const keys = Object.keys(record);
    if (
      keys.length > 0 &&
      keys.every(
        (key) => key === 'message' || key === 'details' || key === 'hint' || key === 'code'
      )
    ) {
      return true;
    }
  }

  return false;
}

function isUnavailableMessage(message: string): boolean {
  return /failed to fetch|networkerror|network request failed|load failed|timeout|econn|enotfound|fetch failed|service for this project|exceed_cached_egress|restricted due to the following/i.test(
    message
  );
}
