export function measurePerformance<T>(name: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  if (typeof window !== 'undefined' && window.console) {
    console.debug(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  }
  return result;
}

export async function measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  if (typeof window !== 'undefined' && window.console) {
    console.debug(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  }
  return result;
}

export function reportWebVitals(metric: { name: string; value: number; id: string }) {
  if (process.env.NODE_ENV === 'production') {
    console.debug(`[WebVitals] ${metric.name}: ${metric.value} (${metric.id})`);
  }
}
