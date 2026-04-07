export const env = {
  socketUrl: import.meta.env.VITE_SOCKET_URL as string,
  isDev: import.meta.env.DEV,
};

if (!env.socketUrl) {
  // Keep explicit failure close to startup to avoid silent socket issues.
  throw new Error('Missing VITE_SOCKET_URL environment variable.');
}
