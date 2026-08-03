'use client';

import { useCallback } from 'react';
import { logger } from '@/lib/logging';

export function useErrorReporting() {
  const reportError = useCallback((error: Error, context?: Record<string, unknown>) => {
    logger.error(error.message, {
      stack: error.stack,
      name: error.name,
      ...context,
    }, 'error-boundary');
  }, []);

  const reportApiError = useCallback((endpoint: string, status: number, message: string) => {
    logger.error(`API Error: ${endpoint}`, {
      endpoint,
      status,
      message,
    }, 'api');
  }, []);

  return { reportError, reportApiError };
}
