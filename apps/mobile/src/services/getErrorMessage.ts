export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const message = data?.message;

  if (Array.isArray(message)) return message.join('\n');
  if (typeof message === 'string' && message.length > 0) return message;
  if (error instanceof Error && error.message) return error.message;

  return fallback;
}
