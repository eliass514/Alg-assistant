import { apiFetch } from './client';

export interface AdminDashboardMetrics {
  totalUsers: number;
  pendingAppointments: number;
  pendingDocuments: number;
  activeServices: number;
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  return apiFetch<AdminDashboardMetrics>('/admin/dashboard/metrics');
}
