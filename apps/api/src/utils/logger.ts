export type LogLevel = 'info' | 'warn' | 'error';

export function log(
  level: LogLevel,
  action: string,
  data: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    action,
    ...data,
  });
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
