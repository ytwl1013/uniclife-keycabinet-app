import { requestApi } from './client';

export type HealthStatus = {
  service: string;
  status: 'ok';
};

export function getHealthStatus() {
  return requestApi<HealthStatus>('/health');
}
