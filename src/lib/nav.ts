import type { AppSidebarItem } from '../components/app/AppSidebar.astro';

export const docenteNavItems: AppSidebarItem[] = [
  { icon: 'chart', label: 'Mis cursos', href: '/docente/cursos' },
  { icon: 'plus', label: 'Nueva actividad', href: '/docente/actividades/nueva' },
  { icon: 'trendingUp', label: 'Tablero', href: '/docente/dashboard' },
];

export const institucionalNavItems: AppSidebarItem[] = [
  { icon: 'school', label: 'Institucional', href: '/institucional' },
  { icon: 'trendingUp', label: 'Tablero', href: '/institucional/dashboard' },
  { icon: 'chart', label: 'Aulas', href: '/institucional/aulas' },
  { icon: 'dollarSign', label: 'Finanzas Escolares', href: '/institucional/finanzas' },
  { icon: 'sparkles', label: 'Costos de IA', href: '/institucional/ia' },
  { icon: 'bell', label: 'Alertas', href: '/institucional/alertas' },
  { icon: 'shield', label: 'Datos personales', href: '/institucional/datos-personales' },
  { icon: 'fileText', label: 'Bitácoras', href: '/institucional/bitacoras' },
  { icon: 'building', label: 'Configuración', href: '/institucional/configuracion' },
];

export const adminNavItems: AppSidebarItem[] = [
  { icon: 'plusSquare', label: 'Nueva institución', href: '/admin/instituciones/nueva' },
  { icon: 'building', label: 'Instituciones', href: '/admin/instituciones' },
  { icon: 'shield', label: 'Roles y Permisos', href: '/admin/roles' },
  { icon: 'wallet', label: 'Finanzas Globales', href: '/admin/finanzas' },
  { icon: 'sparkles', label: 'Costos de IA', href: '/admin/ia' },
  { icon: 'refresh', label: 'Suscripciones', href: '/admin/suscripciones' },
  { icon: 'activity', label: 'Monitoreo', href: '/admin/monitoreo' },
  { icon: 'fileText', label: 'Bitácoras', href: '/admin/bitacoras' },
  { icon: 'kanban', label: 'Jira / Tareas', href: '/admin/jira' },
  { icon: 'code', label: 'API', href: '/admin/api' },
];
