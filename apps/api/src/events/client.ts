import { EventClient, EventClientConfig } from '@collective-strategist/events';

const eventClientConfig: EventClientConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
};

export const eventClient = new EventClient(eventClientConfig);

export async function initializeEventClient(): Promise<void> {
  await eventClient.connect();
}

export async function closeEventClient(): Promise<void> {
  await eventClient.disconnect();
}