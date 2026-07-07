
export const getAnalyzeFileUrl = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'YOUR_API_BASE_URL';
  return `${baseUrl}/analyze`;
};

export const getWebSocketUrl = () => {
  let baseUrl = import.meta.env.VITE_WS_BASE_URL?.replace(/\/$/, '') || 'YOUR_WS_BASE_URL';
  
  if (baseUrl.startsWith('https://')) {
    baseUrl = baseUrl.replace('https://', 'wss://');
  } else if (baseUrl.startsWith('http://')) {
    baseUrl = baseUrl.replace('http://', 'ws://');
  }
  
  return `${baseUrl}/ws/stream`;
};
