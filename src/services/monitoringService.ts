import type { ComponentHealth, IncidentStatus, MonitoringSnapshot } from '../types/monitoring';
import { apiFetch } from '../lib/apiClient';
import { toLower } from '../lib/caseAdapters';

interface BackendMonitoringSnapshot {
  updatedAt: string;
  monthlyUptimePercent: number | null;
  latencyP95Seconds: number | null;
  incidentsThisMonth: number;
  components: { id: string; name: string; health: string; uptimePercent: number }[];
  incidents: { id: string; date: string; component: string; duration: string; status: string }[];
}

export async function getMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  const backend = await apiFetch<BackendMonitoringSnapshot>('/monitoring');
  return {
    updatedAt: backend.updatedAt,
    monthlyUptimePercent: backend.monthlyUptimePercent,
    latencyP95Seconds: backend.latencyP95Seconds,
    incidentsThisMonth: backend.incidentsThisMonth,
    components: backend.components.map((component) => ({
      id: component.id,
      name: component.name,
      health: toLower<ComponentHealth>(component.health),
      uptimePercent: component.uptimePercent,
    })),
    incidents: backend.incidents.map((incident) => ({
      id: incident.id,
      date: incident.date,
      component: incident.component,
      duration: incident.duration,
      status: toLower<IncidentStatus>(incident.status),
    })),
  };
}
