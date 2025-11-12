// Configuration for The Collective Strategist frontend

export const config = {
  // API Base URL - uses domain-relative path for production
  // Falls back to localhost for development
  apiBaseUrl: (import.meta as any).env?.PROD 
    ? 'https://strategist.greenfieldoverride.com' // Production domain
    : 'http://localhost:8007', // Development
  
  // Other environment-specific settings
  isDevelopment: (import.meta as any).env?.DEV,
  isProduction: (import.meta as any).env?.PROD,
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