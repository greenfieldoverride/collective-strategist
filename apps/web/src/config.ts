// Configuration for The Collective Strategist frontend

// Detect production environment more reliably
const isProduction = typeof window !== 'undefined' && 
  (window.location.hostname === 'strategist.greenfieldoverride.com' || 
   (import.meta as any).env?.PROD === true);

export const config = {
  // API Base URL - use production domain or localhost
  apiBaseUrl: isProduction 
    ? 'https://strategist.greenfieldoverride.com' // Production domain
    : 'http://localhost:8007', // Development
  
  // Other environment-specific settings
  isDevelopment: !isProduction,
  isProduction: isProduction,
};

// Helper function to build API URLs
export const apiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If we have a base URL (development), use it
  if (config.apiBaseUrl && config.apiBaseUrl.length > 0) {
    return `${config.apiBaseUrl}/${cleanEndpoint}`;
  }
  
  // In production, use relative paths that nginx will proxy
  return `/${cleanEndpoint}`;
};

export default config;