// Configuration for The Collective Strategist frontend

export const config = {
  // API Base URL - uses relative path for production (proxied by nginx)
  // Falls back to localhost for development
  apiBaseUrl: (import.meta as any).env?.PROD 
    ? '' // In production, use relative paths (nginx proxy handles routing)
    : 'http://localhost:8007', // Development
  
  // Other environment-specific settings
  isDevelopment: (import.meta as any).env?.DEV,
  isProduction: (import.meta as any).env?.PROD,
};

// Helper function to build API URLs
export const apiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (config.apiBaseUrl) {
    return `${config.apiBaseUrl}/${cleanEndpoint}`;
  }
  
  // In production, use relative paths that nginx will proxy
  return `/${cleanEndpoint}`;
};

export default config;