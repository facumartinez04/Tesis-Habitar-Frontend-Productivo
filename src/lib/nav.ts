import type { AppSidebarItem } from '../components/app/AppSidebar.astro';

export const docenteNavItems: AppSidebarItem[] = [
  { icon: 'chart', label: 'Mis cursos', href: '/docente/cursos' },
  { icon: 'plus', label: 'Nueva actividad', href: '/docente/actividades/nueva' },
];

export const institucionalNavItems: AppSidebarItem[] = [
  { icon: 'school', label: 'Institucional', href: '/institucional' },
  { icon: 'bell', label: 'Alertas', href: '/institucional/alertas' },
  { icon: 'shield', label: 'Datos personales', href: '/institucional/datos-personales' },
  { icon: 'building', label: 'Configuración', href: '/institucional/configuracion' },
];

export const adminNavItems: AppSidebarItem[] = [
  { icon: 'plusSquare', label: 'Nueva institución', href: '/admin/instituciones/nueva' },
  { icon: 'building', label: 'Instituciones', href: '/admin/instituciones/oauth?slug=belgrano-norte' },
  { icon: 'refresh', label: 'Suscripciones', href: '/admin/suscripciones' },
  { icon: 'activity', label: 'Monitoreo', href: '/admin/monitoreo' },
];
