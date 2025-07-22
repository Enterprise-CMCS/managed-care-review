/**
 * Authentication URL configuration for different environments
 */

export const AUTH_CALLBACK_URLS = {
  dev: ['http://localhost:3000', 'http://localhost:3001'],
  val: ['https://val.mcr.gov'],
  prod: ['https://mcr.gov', 'https://www.mcr.gov']
} as const;

export type Stage = keyof typeof AUTH_CALLBACK_URLS;

/**
 * Get callback URLs for a specific stage
 */
export function getCallbackUrls(stage: string): string[] {
  const urls = AUTH_CALLBACK_URLS[stage as Stage];
  return urls ? [...urls] : [];
}

/**
 * Get logout URLs for a specific stage
 * Currently same as callback URLs
 */
export function getLogoutUrls(stage: string): string[] {
  return getCallbackUrls(stage);
}