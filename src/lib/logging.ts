type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
  source?: string;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, source?: string) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      source,
    };

    if (this.isProduction) {
      console[level](`[${entry.timestamp}] [${level.toUpperCase()}] [${source || 'app'}]`, message, data || '');
    } else {
      console[level](`[${level.toUpperCase()}] [${source || 'app'}]`, message, data || '');
    }
  }

  debug(message: string, data?: Record<string, unknown>, source?: string) {
    this.log('debug', message, data, source);
  }

  info(message: string, data?: Record<string, unknown>, source?: string) {
    this.log('info', message, data, source);
  }

  warn(message: string, data?: Record<string, unknown>, source?: string) {
    this.log('warn', message, data, source);
  }

  error(message: string, data?: Record<string, unknown>, source?: string) {
    this.log('error', message, data, source);
  }
}

export const logger = new Logger();
