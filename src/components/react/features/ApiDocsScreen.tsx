import { useState, useMemo } from 'react';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type ApiTag =
  | 'Todos'
  | 'Jira & IA'
  | 'Autenticación'
  | 'Instituciones'
  | 'Actividades & Cursos'
  | 'Resultados & Analítica'
  | 'Cumplimiento & GDPR'
  | 'Suscripciones'
  | 'Monitoreo & Salud';

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface ResponseDef {
  status: number;
  label: string;
  description: string;
  example?: any;
}

interface EndpointDef {
  id: string;
  method: HttpMethod;
  path: string;
  tag: Exclude<ApiTag, 'Todos'>;
  summary: string;
  description: string;
  auth: string;
  pathParams?: Parameter[];
  queryParams?: Parameter[];
  requestBody?: {
    contentType: string;
    description: string;
    example: any;
  };
  responses: ResponseDef[];
}

const ENDPOINTS: EndpointDef[] = [

  {
    id: 'jira-get-issues',
    method: 'GET',
    path: '/api/jira/issues',
    tag: 'Jira & IA',
    summary: 'Listar todas las tareas del tablero Jira / Kanban',
    description: 'Obtiene el listado completo de tareas del backlog y tablero Kanban persistidas en PostgreSQL con su estado, prioridad, etiquetas y checklists.',
    auth: 'Sesión Admin o Bearer IA',
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Lista de issues ordenadas por orden de visualización.',
        example: {
          issues: [
            {
              id: 'hab-1',
              key: 'HAB-1',
              title: 'Integrar autenticación Google Workspace con OAuth2',
              description: 'Permitir que docentes inicien sesión...',
              status: 'DONE',
              priority: 'HIGH',
              storyPoints: 5,
              tags: ['auth', 'security'],
              checklist: [{ id: '1', text: 'Configurar Client ID', completed: true }],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'jira-create-issue',
    method: 'POST',
    path: '/api/jira/issues',
    tag: 'Jira & IA',
    summary: 'Crear una nueva tarea en el tablero',
    description: 'Crea una nueva tarea o historia de usuario asignándole título, descripción, prioridad, estado y checklist inicial.',
    auth: 'Sesión Admin o Bearer IA',
    requestBody: {
      contentType: 'application/json',
      description: 'Datos de la tarea a crear',
      example: {
        title: 'Optimizar exportación de reportes de lectura',
        description: 'Mejorar el tiempo de descarga del Excel de calificaciones.',
        status: 'TODO',
        priority: 'MEDIUM',
        storyPoints: 3,
        tags: ['reportes', 'performance'],
        checklist: [{ text: 'Agregar compresión gzip' }],
      },
    },
    responses: [
      {
        status: 201,
        label: '201 Created',
        description: 'Tarea creada con su clave identificadora asignada.',
        example: {
          issue: {
            id: 'hab-9',
            key: 'HAB-9',
            title: 'Optimizar exportación de reportes de lectura',
            status: 'TODO',
            createdAt: '2026-09-08T12:00:00.000Z',
          },
        },
      },
    ],
  },
  {
    id: 'jira-get-one',
    method: 'GET',
    path: '/api/jira/issues/:id',
    tag: 'Jira & IA',
    summary: 'Obtener detalle de una tarea específica',
    description: 'Recupera la información completa de una tarea incluyendo su historial de comentarios y estado de los checklists.',
    auth: 'Sesión Admin o Bearer IA',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'ID único o clave (HAB-X) de la tarea.' }],
    responses: [
      { status: 200, label: '200 OK', description: 'Detalle de la tarea.' },
      { status: 404, label: '404 Not Found', description: 'Tarea no encontrada.' },
    ],
  },
  {
    id: 'jira-update-issue',
    method: 'PATCH',
    path: '/api/jira/issues/:id',
    tag: 'Jira & IA',
    summary: 'Actualizar campos o mover estado de una tarea',
    description: 'Permite cambiar la columna de estado (TODO, IN_PROGRESS, IN_REVIEW, DONE), modificar story points, checklists o comentarios.',
    auth: 'Sesión Admin o Bearer IA',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'ID único de la tarea.' }],
    requestBody: {
      contentType: 'application/json',
      description: 'Campos a modificar',
      example: {
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        checklist: [{ id: 'chk-1', text: 'Revisión técnica', completed: true }],
      },
    },
    responses: [
      { status: 200, label: '200 OK', description: 'Tarea actualizada con éxito.' },
    ],
  },
  {
    id: 'jira-delete-issue',
    method: 'DELETE',
    path: '/api/jira/issues/:id',
    tag: 'Jira & IA',
    summary: 'Eliminar definitivamente una tarea',
    description: 'Borra la tarea del tablero y de la base de datos PostgreSQL de forma permanente.',
    auth: 'Sesión Admin o Bearer IA',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'ID de la tarea a eliminar.' }],
    responses: [
      { status: 204, label: '204 No Content', description: 'Tarea eliminada exitosamente.' },
    ],
  },
  {
    id: 'jira-get-tokens',
    method: 'GET',
    path: '/api/jira/tokens',
    tag: 'Jira & IA',
    summary: 'Listar tokens de acceso para agentes de IA',
    description: 'Lista los tokens API Bearer generados para que las IAs o scripts externos se autentiquen contra el Jira de Habitar.',
    auth: 'Sesión Admin',
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Lista de tokens activos y revocados.',
        example: {
          tokens: [
            {
              id: 'tok-1',
              name: 'Agente Antigravity / Claude',
              token: 'hab_jira_8f3d...9a2',
              createdAt: '2026-09-08T10:00:00.000Z',
              active: true,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'jira-create-token',
    method: 'POST',
    path: '/api/jira/tokens',
    tag: 'Jira & IA',
    summary: 'Generar token de acceso Bearer para IA',
    description: 'Genera un nuevo token criptográfico seguro con prefijo `hab_jira_` para que un agente de IA pueda automatizar la creación y gestión de cards.',
    auth: 'Sesión Admin',
    requestBody: {
      contentType: 'application/json',
      description: 'Nombre descriptivo del token',
      example: { name: 'Agente Inteligente Scrum Master' },
    },
    responses: [
      {
        status: 201,
        label: '201 Created',
        description: 'Token generado exitosamente con su secreto.',
        example: {
          token: {
            id: 'tok-2',
            name: 'Agente Inteligente Scrum Master',
            token: 'hab_jira_a7c3e9812dfb5e408a213904',
          },
        },
      },
    ],
  },
  {
    id: 'jira-delete-token',
    method: 'DELETE',
    path: '/api/jira/tokens/:id',
    tag: 'Jira & IA',
    summary: 'Revocar token de acceso para IA',
    description: 'Desactiva de forma inmediata un token de acceso para que ninguna IA o script externo pueda seguir utilizándolo.',
    auth: 'Sesión Admin',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'ID del token a revocar.' }],
    responses: [
      { status: 204, label: '204 No Content', description: 'Token revocado correctamente.' },
    ],
  },
  {
    id: 'jira-ai-batch-cards',
    method: 'POST',
    path: '/api/jira/ai/cards',
    tag: 'Jira & IA',
    summary: 'Lote de creación de tarjetas generado por IA',
    description: 'Endpoint optimizado para que agentes de IA creen múltiples historias de usuario, tareas de backlog o incidencias técnicas en una única llamada HTTP enviando el token en el header `Authorization: Bearer <token>`.',
    auth: 'Bearer Token (hab_jira_*)',
    requestBody: {
      contentType: 'application/json',
      description: 'Array de tarjetas a generar',
      example: {
        cards: [
          {
            title: 'Implementar cálculo automático de nivel de legibilidad',
            description: 'Como docente necesito calcular el índice Flesch-Szigriszt en textos cargados.',
            priority: 'HIGH',
            storyPoints: 5,
            tags: ['ia', 'pedagogia'],
            checklist: [
              { text: 'Crear servicio de análisis léxico' },
              { text: 'Conectar al editor de actividades' },
            ],
          },
          {
            title: 'Agregar test unitario de exportación CSV',
            description: 'Verificar compatibilidad de encoding UTF-8 en Excel.',
            priority: 'LOW',
            storyPoints: 2,
            tags: ['qa', 'testing'],
          },
        ],
      },
    },
    responses: [
      {
        status: 201,
        label: '201 Created',
        description: 'Tarjetas creadas e insertadas en el tablero.',
        example: {
          success: true,
          count: 2,
          cards: [{ key: 'HAB-10', title: '...' }, { key: 'HAB-11', title: '...' }],
        },
      },
    ],
  },

  {
    id: 'auth-login',
    method: 'POST',
    path: '/api/auth/login',
    tag: 'Autenticación',
    summary: 'Iniciar sesión con email y contraseña',
    description: 'Autentica a un usuario institucional o administrador mediante credenciales directas y retorna el token JWT junto a la cookie de sesión segura.',
    auth: 'Público',
    requestBody: {
      contentType: 'application/json',
      description: 'Credenciales del usuario',
      example: { email: 'docente@colegio.edu.ar', password: 'MiPasswordSegura123!' },
    },
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Sesión iniciada con éxito.',
        example: {
          user: { id: 'usr-1', email: 'docente@colegio.edu.ar', role: 'DOCENTE' },
          token: 'eyJhbGciOiJIUzI1NiIsInR5c...',
        },
      },
      { status: 401, label: '401 Unauthorized', description: 'Credenciales inválidas.' },
    ],
  },
  {
    id: 'auth-me',
    method: 'GET',
    path: '/api/auth/me',
    tag: 'Autenticación',
    summary: 'Obtener datos del usuario actual autenticado',
    description: 'Retorna el perfil del usuario, la institución a la que pertenece y su rol con permisos a partir de la cookie de sesión o JWT.',
    auth: 'JWT (Cualquiera)',
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Perfil del usuario actual.',
        example: {
          id: 'usr-1',
          email: 'admin@habitar.lat',
          name: 'Super Administrador',
          role: 'ADMIN',
        },
      },
    ],
  },
  {
    id: 'auth-admin-session',
    method: 'POST',
    path: '/api/auth/admin-session',
    tag: 'Autenticación',
    summary: 'Inicializar sesión de superadministrador',
    description: 'Establece una sesión administrativa para superusuarios autorizados de la plataforma Habitar.',
    auth: 'Público / SuperAdmin',
    responses: [
      { status: 200, label: '200 OK', description: 'Sesión admin generada con cookie segura.' },
    ],
  },
  {
    id: 'auth-oauth-redirect',
    method: 'GET',
    path: '/api/auth/:provider',
    tag: 'Autenticación',
    summary: 'Iniciar flujo OAuth 2.0 / OIDC',
    description: 'Redirige al usuario al proveedor de identidad de su institución educativa (Google Workspace o Microsoft 365) para autenticación sin contraseña.',
    auth: 'Público',
    pathParams: [{ name: 'provider', type: 'string', required: true, description: "'google' o 'microsoft'" }],
    responses: [
      { status: 302, label: '302 Found', description: 'Redirección a la pantalla de consentimiento de Google/Microsoft.' },
    ],
  },
  {
    id: 'auth-oauth-callback',
    method: 'GET',
    path: '/api/auth/:provider/callback',
    tag: 'Autenticación',
    summary: 'Callback de respuesta OAuth 2.0',
    description: 'Recibe el código de autorización emitido por Google o Microsoft, valida el dominio institucional, emite el JWT y redirige al dashboard.',
    auth: 'Público',
    pathParams: [{ name: 'provider', type: 'string', required: true, description: "'google' o 'microsoft'" }],
    queryParams: [
      { name: 'code', type: 'string', required: true, description: 'Código de autorización devuelto por el IdP.' },
      { name: 'state', type: 'string', required: false, description: 'Token CSRF de verificación.' },
    ],
    responses: [
      { status: 302, label: '302 Found', description: 'Redirección al dashboard o a /login?error=...' },
    ],
  },

  {
    id: 'inst-list',
    method: 'GET',
    path: '/api/institutions',
    tag: 'Instituciones',
    summary: 'Listar todas las instituciones educativas registradas',
    description: 'Retorna el catálogo global de instituciones, sus dominios habilitados, estado operativo y métricas de alumnos.',
    auth: 'Admin',
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Lista de instituciones registradas.',
        example: [
          {
            id: 'inst-1',
            name: 'Colegio Nacional Buenos Aires',
            slug: 'cnba',
            domain: 'cnba.uba.ar',
            status: 'ACTIVA',
          },
        ],
      },
    ],
  },
  {
    id: 'inst-create',
    method: 'POST',
    path: '/api/institutions',
    tag: 'Instituciones',
    summary: 'Dar de alta una nueva institución educativa',
    description: 'Registra una institución nueva, asociando su slug de acceso, dominios de correo electrónico autorizados y configuración inicial.',
    auth: 'Admin',
    requestBody: {
      contentType: 'application/json',
      description: 'Datos de la institución',
      example: {
        name: 'Instituto San Martín',
        slug: 'san-martin',
        domain: 'sanmartin.edu.ar',
        cuit: '30-71234567-8',
        plan: 'PROFESIONAL',
      },
    },
    responses: [
      { status: 201, label: '201 Created', description: 'Institución registrada con éxito.' },
    ],
  },
  {
    id: 'inst-get-slug',
    method: 'GET',
    path: '/api/institutions/:slug',
    tag: 'Instituciones',
    summary: 'Obtener datos de institución por slug',
    description: 'Recupera los datos públicos y configuraciones pedagógicas de una institución utilizando su identificador slug amigable.',
    auth: 'JWT (Cualquiera)',
    pathParams: [{ name: 'slug', type: 'string', required: true, description: 'Slug único de la institución (ej: cnba).' }],
    responses: [
      { status: 200, label: '200 OK', description: 'Datos de la institución.' },
    ],
  },
  {
    id: 'inst-patch-config',
    method: 'PATCH',
    path: '/api/institutions/:institutionId/config',
    tag: 'Instituciones',
    summary: 'Actualizar configuración institucional',
    description: 'Modifica parámetros de la institución como umbrales de alerta temprana, límites de generación con IA o días de retención de datos.',
    auth: 'Coordinador o Admin',
    pathParams: [{ name: 'institutionId', type: 'string', required: true, description: 'ID de la institución.' }],
    requestBody: {
      contentType: 'application/json',
      description: 'Configuraciones a actualizar',
      example: {
        aiMonthlyTokenLimit: 500000,
        riskThresholdScore: 6.0,
        enableAutoFeedback: true,
      },
    },
    responses: [
      { status: 200, label: '200 OK', description: 'Configuración actualizada.' },
    ],
  },
  {
    id: 'inst-ai-usage',
    method: 'GET',
    path: '/api/institutions/:institutionId/ai-usage',
    tag: 'Instituciones',
    summary: 'Consultar consumo de tokens y llamadas de IA',
    description: 'Retorna el volumen acumulado de tokens consumidos en generación de actividades y análisis pedagógico con IA.',
    auth: 'Docente, Coordinador o Admin',
    pathParams: [{ name: 'institutionId', type: 'string', required: true, description: 'ID de la institución.' }],
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Métricas de consumo de IA.',
        example: {
          consumedTokens: 142300,
          limitTokens: 500000,
          percentUsed: 28.46,
          lastActivityAt: '2026-09-08T11:20:00.000Z',
        },
      },
    ],
  },
  {
    id: 'inst-users',
    method: 'GET',
    path: '/api/institutions/:institutionId/users',
    tag: 'Instituciones',
    summary: 'Listar usuarios y docentes de la institución',
    description: 'Consulta la nómina de profesores, coordinadores y administradores vinculados a la institución educativa.',
    auth: 'Coordinador o Admin',
    pathParams: [{ name: 'institutionId', type: 'string', required: true, description: 'ID de la institución.' }],
    responses: [
      { status: 200, label: '200 OK', description: 'Lista de usuarios institucionales.' },
    ],
  },
  {
    id: 'inst-invite-user',
    method: 'POST',
    path: '/api/institutions/:institutionId/users',
    tag: 'Instituciones',
    summary: 'Invitar o dar de alta un usuario en la institución',
    description: 'Agrega un docente o coordinador a la institución, asignándole su rol operativo inicial.',
    auth: 'Coordinador o Admin',
    pathParams: [{ name: 'institutionId', type: 'string', required: true, description: 'ID de la institución.' }],
    requestBody: {
      contentType: 'application/json',
      description: 'Datos del usuario',
      example: { email: 'profesor.garcia@colegio.edu.ar', name: 'Martín García', role: 'DOCENTE' },
    },
    responses: [
      { status: 201, label: '201 Created', description: 'Usuario dado de alta exitosamente.' },
    ],
  },

  {
    id: 'courses-list',
    method: 'GET',
    path: '/api/courses',
    tag: 'Actividades & Cursos',
    summary: 'Listar cursos del docente autenticado',
    description: 'Devuelve todos los cursos o materias donde el docente está asignado con la cantidad de alumnos y actividades activas.',
    auth: 'Docente, Coordinador o Admin',
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Lista de cursos asignados.',
        example: [
          { id: 'c-1', name: 'Lengua y Literatura - 3° A', studentsCount: 28, division: 'A' },
        ],
      },
    ],
  },
  {
    id: 'activities-generate',
    method: 'POST',
    path: '/api/activities/generate-questions',
    tag: 'Actividades & Cursos',
    summary: 'Generar preguntas pedagógicas asistidas por IA',
    description: 'Envía un texto o fragmento literario al modelo de lenguaje (DeepSeek) para generar preguntas inferenciales, literales y críticas con rúbrica.',
    auth: 'Docente',
    requestBody: {
      contentType: 'application/json',
      description: 'Parámetros del texto y nivel escolar',
      example: {
        text: 'El almohadón de plumas fue publicado por Horacio Quiroga...',
        gradeLevel: 'Secundario',
        questionCount: 4,
        types: ['INFERENCIAL', 'VOCABULARIO_EN_CONTEXTO'],
      },
    },
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Preguntas y opciones generadas por la IA.',
        example: {
          questions: [
            {
              statement: '¿Qué representa la frialdad de la casa en relación con el matrimonio?',
              options: ['Distanciamiento emocional', 'Ahorro de calefacción', 'Misterio policiaco'],
              correctIndex: 0,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'activities-create',
    method: 'POST',
    path: '/api/activities',
    tag: 'Actividades & Cursos',
    summary: 'Crear y guardar una actividad educativa',
    description: 'Almacena una actividad con su texto de lectura, preguntas, opciones, rúbricas y código de acceso para los estudiantes.',
    auth: 'Docente',
    requestBody: {
      contentType: 'application/json',
      description: 'Detalle de la actividad',
      example: {
        title: 'Evaluación Formativa: Cuentos de la Selva',
        courseId: 'c-1',
        readingText: 'Había una vez...',
        questions: [{ statement: 'Pregunta 1', options: ['A', 'B'], correctOption: 0 }],
      },
    },
    responses: [
      { status: 201, label: '201 Created', description: 'Actividad creada con su código PIN asignado.' },
    ],
  },
  {
    id: 'activities-by-code',
    method: 'GET',
    path: '/api/activities/:code',
    tag: 'Actividades & Cursos',
    summary: 'Obtener actividad para alumnos por código PIN',
    description: 'Permite que un estudiante cargue la actividad ingresando el PIN de 6 caracteres desde su dispositivo sin necesidad de contraseña.',
    auth: 'Público',
    pathParams: [{ name: 'code', type: 'string', required: true, description: 'Código alfanumérico de la actividad (ej: HAB-492).' }],
    responses: [
      { status: 200, label: '200 OK', description: 'Contenido y preguntas de la actividad.' },
      { status: 404, label: '404 Not Found', description: 'Código no válido o actividad no publicada.' },
    ],
  },
  {
    id: 'activities-submit',
    method: 'POST',
    path: '/api/activities/:code/responses',
    tag: 'Actividades & Cursos',
    summary: 'Enviar respuestas del estudiante',
    description: 'Registra las respuestas marcadas por el alumno al finalizar la lectura para su corrección automática y análisis diagnóstico.',
    auth: 'Público',
    pathParams: [{ name: 'code', type: 'string', required: true, description: 'Código de la actividad.' }],
    requestBody: {
      contentType: 'application/json',
      description: 'Respuestas del estudiante',
      example: {
        studentName: 'Sofía Romero',
        answers: [{ questionId: 'q-1', selectedOption: 0 }],
        readingTimeSeconds: 240,
      },
    },
    responses: [
      { status: 200, label: '200 OK', description: 'Respuestas evaluadas y registradas con éxito.' },
    ],
  },

  {
    id: 'results-course',
    method: 'GET',
    path: '/api/results/courses/:courseId',
    tag: 'Resultados & Analítica',
    summary: 'Resumen pedagógico y tasa de acierto del curso',
    description: 'Agrega las métricas de comprensión lectora, distribución de notas, preguntas más difíciles y alumnos que requieren apoyo.',
    auth: 'Docente, Coordinador o Admin',
    pathParams: [{ name: 'courseId', type: 'string', required: true, description: 'ID del curso.' }],
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Estadísticas agregadas del curso.',
        example: {
          averageScore: 7.8,
          completionRate: 92.5,
          atRiskStudentsCount: 3,
        },
      },
    ],
  },
  {
    id: 'results-student',
    method: 'GET',
    path: '/api/results/students/:studentId',
    tag: 'Resultados & Analítica',
    summary: 'Detalle de desempeño individual del estudiante',
    description: 'Evolución temporal del alumno, competencias adquiridas, historial de actividades y recomendaciones personalizadas.',
    auth: 'Docente, Coordinador o Admin',
    pathParams: [{ name: 'studentId', type: 'string', required: true, description: 'ID del alumno.' }],
    responses: [
      { status: 200, label: '200 OK', description: 'Ficha diagnóstica del alumno.' },
    ],
  },
  {
    id: 'results-compare',
    method: 'GET',
    path: '/api/results/courses/:courseId/compare',
    tag: 'Resultados & Analítica',
    summary: 'Comparativa de resultados entre períodos lectivos',
    description: 'Permite cruzar métricas entre dos trimestres, años o divisiones para evaluar la progresión del aprendizaje.',
    auth: 'Docente, Coordinador o Admin',
    pathParams: [{ name: 'courseId', type: 'string', required: true, description: 'ID del curso.' }],
    queryParams: [
      { name: 'periodo1', type: 'string', required: true, description: 'Identificador del primer período.' },
      { name: 'periodo2', type: 'string', required: true, description: 'Identificador del segundo período a comparar.' },
    ],
    responses: [
      { status: 200, label: '200 OK', description: 'Comparativa estadística y gráfica de progreso.' },
    ],
  },

  {
    id: 'comp-students-search',
    method: 'GET',
    path: '/api/compliance/students',
    tag: 'Cumplimiento & GDPR',
    summary: 'Búsqueda de alumnos en el registro de protección de datos',
    description: 'Permite ubicar registros de estudiantes para ejercer derechos de acceso, rectificación, portabilidad o supresión de datos.',
    auth: 'Coordinador o Admin',
    queryParams: [{ name: 'q', type: 'string', required: false, description: 'Nombre o identificador del estudiante.' }],
    responses: [
      { status: 200, label: '200 OK', description: 'Coincidencias en el registro institucional.' },
    ],
  },
  {
    id: 'comp-audit-log',
    method: 'GET',
    path: '/api/compliance/audit-log',
    tag: 'Cumplimiento & GDPR',
    summary: 'Registro de auditoría inmutable de accesos y cambios',
    description: 'Bitácora de seguridad que registra quién consultó, exportó o modificó información confidencial de alumnos e instituciones.',
    auth: 'Coordinador o Admin',
    responses: [
      { status: 200, label: '200 OK', description: 'Eventos de auditoría cronológicos.' },
    ],
  },
  {
    id: 'comp-export-student',
    method: 'POST',
    path: '/api/compliance/students/:studentId/export',
    tag: 'Cumplimiento & GDPR',
    summary: 'Exportar legajo de datos personales (Portabilidad)',
    description: 'Genera un archivo JSON o descargable con todos los datos y registros de actividad del alumno para cumplir con el derecho de portabilidad.',
    auth: 'Coordinador o Admin',
    pathParams: [{ name: 'studentId', type: 'string', required: true, description: 'ID del estudiante.' }],
    responses: [
      { status: 200, label: '200 OK', description: 'Archivo de datos exportado.' },
    ],
  },
  {
    id: 'comp-delete-student',
    method: 'DELETE',
    path: '/api/compliance/students/:studentId',
    tag: 'Cumplimiento & GDPR',
    summary: 'Eliminar o anonimizar datos del alumno (Derecho al Olvido)',
    description: 'Ejecuta la supresión definitiva o anonimización irreversible de los datos de un alumno conforme a la ley de protección de datos personales.',
    auth: 'Coordinador o Admin',
    pathParams: [{ name: 'studentId', type: 'string', required: true, description: 'ID del estudiante.' }],
    responses: [
      { status: 204, label: '204 No Content', description: 'Datos anonimizados y eliminados correctamente.' },
    ],
  },
  {
    id: 'comp-retention-purge',
    method: 'POST',
    path: '/api/compliance/retention/:institutionId/purge',
    tag: 'Cumplimiento & GDPR',
    summary: 'Ejecutar purga forzada de datos vencidos',
    description: 'Dispara el proceso de limpieza y borrado seguro de registros que han superado el período legal de retención establecido.',
    auth: 'Coordinador o Admin',
    pathParams: [{ name: 'institutionId', type: 'string', required: true, description: 'ID de la institución.' }],
    responses: [
      { status: 200, label: '200 OK', description: 'Cantidad de registros purgados con éxito.' },
    ],
  },

  {
    id: 'sub-list',
    method: 'GET',
    path: '/api/subscriptions',
    tag: 'Suscripciones',
    summary: 'Listar todas las suscripciones institucionales',
    description: 'Consulta los contratos de servicio, planes contratados, fechas de vencimiento y estado de facturación.',
    auth: 'Admin',
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Listado de suscripciones.',
        example: [
          {
            id: 'sub-1',
            institutionName: 'Colegio San Martín',
            plan: 'ENTERPRISE',
            status: 'ACTIVA',
            renewDate: '2027-01-01',
          },
        ],
      },
    ],
  },
  {
    id: 'sub-plans',
    method: 'GET',
    path: '/api/subscriptions/plans',
    tag: 'Suscripciones',
    summary: 'Listar catálogo de planes disponibles',
    description: 'Retorna los planes comerciales vigentes (Básico, Profesional, Enterprise) con sus características y cuotas de uso.',
    auth: 'Admin',
    responses: [
      { status: 200, label: '200 OK', description: 'Planes comerciales de la plataforma.' },
    ],
  },
  {
    id: 'sub-renew',
    method: 'POST',
    path: '/api/subscriptions/:id/renew',
    tag: 'Suscripciones',
    summary: 'Renovar período de suscripción',
    description: 'Extiende la vigencia del plan de una institución por un nuevo período anual o mensual.',
    auth: 'Admin',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'ID de la suscripción.' }],
    responses: [
      { status: 200, label: '200 OK', description: 'Suscripción renovada exitosamente.' },
    ],
  },

  {
    id: 'mon-snapshot',
    method: 'GET',
    path: '/api/monitoring',
    tag: 'Monitoreo & Salud',
    summary: 'Snapshot de métricas de infraestructura y salud',
    description: 'Obtiene el estado de salud en tiempo real de los servicios core (PostgreSQL, APIs externas, latencia p95 y disponibilidad de memoria).',
    auth: 'Admin',
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Métricas de infraestructura y componentes.',
        example: {
          uptime: '99.98%',
          latencyMs: 38,
          components: [
            { name: 'PostgreSQL Database', health: 'operativo' },
            { name: 'DeepSeek LLM Gateway', health: 'operativo' },
          ],
        },
      },
    ],
  },
  {
    id: 'status-health',
    method: 'GET',
    path: '/api/status/health',
    tag: 'Monitoreo & Salud',
    summary: 'Healthcheck de la API para Coolify y balanceadores',
    description: 'Endpoint ultraliviano utilizado por Coolify, Docker y balanceadores de carga para verificar que el backend responde adecuadamente.',
    auth: 'Público',
    responses: [
      {
        status: 200,
        label: '200 OK',
        description: 'Backend en funcionamiento normal.',
        example: { status: 'ok', timestamp: '2026-09-08T12:00:00.000Z' },
      },
    ],
  },
  {
    id: 'feedback-student',
    method: 'GET',
    path: '/api/feedback/student/:studentId',
    tag: 'Monitoreo & Salud',
    summary: 'Listar devoluciones pedagógicas del estudiante',
    description: 'Recupera las recomendaciones y retroalimentaciones cualitativas enviadas a un estudiante por sus docentes.',
    auth: 'Docente o Coordinador',
    pathParams: [{ name: 'studentId', type: 'string', required: true, description: 'ID del alumno.' }],
    responses: [
      { status: 200, label: '200 OK', description: 'Lista de devoluciones.' },
    ],
  },
];

const TAGS: ApiTag[] = [
  'Todos',
  'Jira & IA',
  'Autenticación',
  'Instituciones',
  'Actividades & Cursos',
  'Resultados & Analítica',
  'Cumplimiento & GDPR',
  'Suscripciones',
  'Monitoreo & Salud',
];

const METHOD_COLORS: Record<HttpMethod, { bg: string; border: string; text: string; badgeBg: string }> = {
  GET: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-500/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    badgeBg: 'bg-emerald-600 text-white',
  },
  POST: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-500/40',
    text: 'text-blue-700 dark:text-blue-400',
    badgeBg: 'bg-blue-600 text-white',
  },
  PATCH: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-500/40',
    text: 'text-amber-700 dark:text-amber-400',
    badgeBg: 'bg-amber-600 text-white',
  },
  DELETE: {
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    border: 'border-rose-500/40',
    text: 'text-rose-700 dark:text-rose-400',
    badgeBg: 'bg-rose-600 text-white',
  },
};

export function ApiDocsScreen() {
  const [selectedTag, setSelectedTag] = useState<ApiTag>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({});
  const [copiedCurlId, setCopiedCurlId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const baseUrl = 'https://api.habitar.lat';

  const filteredEndpoints = useMemo(() => {
    return ENDPOINTS.filter((ep) => {
      const matchesTag = selectedTag === 'Todos' || ep.tag === selectedTag;
      const matchesMethod = methodFilter === 'ALL' || ep.method === methodFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        ep.path.toLowerCase().includes(query) ||
        ep.summary.toLowerCase().includes(query) ||
        ep.description.toLowerCase().includes(query) ||
        ep.auth.toLowerCase().includes(query) ||
        ep.method.toLowerCase().includes(query);

      return matchesTag && matchesMethod && matchesQuery;
    });
  }, [selectedTag, methodFilter, searchQuery]);

  function toggleEndpoint(id: string) {
    setExpandedEndpoints((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function expandAll() {
    const allExpanded: Record<string, boolean> = {};
    filteredEndpoints.forEach((ep) => {
      allExpanded[ep.id] = true;
    });
    setExpandedEndpoints(allExpanded);
  }

  function collapseAll() {
    setExpandedEndpoints({});
  }

  function copyBaseUrl() {
    navigator.clipboard.writeText(baseUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  function copyCurl(ep: EndpointDef) {
    let curl = `curl -X ${ep.method} "${baseUrl}${ep.path}"`;
    if (ep.auth.includes('Bearer')) {
      curl += ` \\\n  -H "Authorization: Bearer <TU_TOKEN_IA>"`;
    } else if (ep.auth.includes('Admin') || ep.auth.includes('JWT') || ep.auth.includes('Docente')) {
      curl += ` \\\n  -H "Authorization: Bearer <TU_JWT_TOKEN>"`;
    }

    if (ep.requestBody?.example) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(ep.requestBody.example, null, 2)}'`;
    }

    navigator.clipboard.writeText(curl);
    setCopiedCurlId(ep.id);
    setTimeout(() => setCopiedCurlId(null), 2500);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {}
      <div className="bg-white dark:bg-[#1A1E29] border border-gray-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-pri tracking-tight">Habitar API Documentation</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                v1.0.0 OAS 3.0
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
                REST / JSON
              </span>
            </div>
            <p className="text-sm text-text-sec mt-1 max-w-2xl">
              Catálogo completo de endpoints del backend de Habitar. Permite la integración del cliente web, sincronización de datos institucionales y automatización mediante agentes de Inteligencia Artificial.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyBaseUrl}
              className="inline-flex items-center gap-2 px-3 py-2 bg-surface hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-border rounded-lg text-xs font-medium text-text-pri transition-colors"
              title="Copiar Base URL"
            >
              <code className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">{baseUrl}</code>
              <svg className="w-4 h-4 text-text-ter" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2" />
              </svg>
              {copiedUrl && <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">¡Copiado!</span>}
            </button>
          </div>
        </div>

        {}
        <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-ter"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por ruta (/api/jira, /auth...), resumen o método..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-border rounded-lg text-xs bg-surface dark:bg-[#131620] text-text-pri placeholder-text-ter focus:outline-hidden focus:ring-2 focus:ring-green-mid"
            />
          </div>

          {}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center bg-gray-100 dark:bg-[#131620] p-1 rounded-lg border border-gray-200 dark:border-gray-800 text-xs">
              {['ALL', 'GET', 'POST', 'PATCH', 'DELETE'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`px-2.5 py-1 rounded font-mono font-medium transition-all ${
                    methodFilter === m
                      ? 'bg-white dark:bg-[#222736] shadow-xs text-text-pri font-bold'
                      : 'text-text-sec hover:text-text-pri'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={expandAll}
                className="px-2.5 py-1.5 text-xs text-text-sec hover:text-text-pri border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-800 font-medium"
              >
                Expandir todos
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1.5 text-xs text-text-sec hover:text-text-pri border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-800 font-medium"
              >
                Colapsar todos
              </button>
            </div>
          </div>
        </div>

        {}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 border-t border-gray-100 dark:border-gray-800 mt-4 text-xs">
          {TAGS.map((t) => {
            const count = t === 'Todos' ? ENDPOINTS.length : ENDPOINTS.filter((e) => e.tag === t).length;
            const isSelected = selectedTag === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedTag(t)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-green-dark text-white shadow-xs'
                    : 'bg-surface hover:bg-gray-100 dark:hover:bg-zinc-800 text-text-sec hover:text-text-pri border border-gray-border'
                }`}
              >
                <span>{t}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-zinc-800 text-text-ter dark:text-text-sec'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {}
      <div className="space-y-3">
        {filteredEndpoints.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1E29] border border-gray-border rounded-xl p-12 text-center text-text-sec">
            <svg className="w-12 h-12 mx-auto text-text-ter mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth="1.5" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="1.5" />
            </svg>
            <div className="text-base font-medium text-text-pri">No se encontraron endpoints</div>
            <div className="text-xs text-text-ter mt-1">Prueba cambiando los filtros de búsqueda o categoría.</div>
          </div>
        ) : (
          filteredEndpoints.map((ep) => {
            const isExpanded = !!expandedEndpoints[ep.id];
            const colors = METHOD_COLORS[ep.method];

            return (
              <div
                key={ep.id}
                className={`border rounded-xl overflow-hidden transition-all duration-200 ${colors.border} bg-white dark:bg-[#1A1E29] shadow-xs`}
              >
                {}
                <div
                  onClick={() => toggleEndpoint(ep.id)}
                  className={`px-4 py-3 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${colors.bg} hover:brightness-95 transition-all`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {}
                    <span
                      className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md tracking-wider min-w-[70px] text-center ${colors.badgeBg}`}
                    >
                      {ep.method}
                    </span>

                    {}
                    <code className="font-mono text-sm font-semibold text-text-pri">
                      {ep.path}
                    </code>

                    {}
                    <span className="text-xs text-text-sec hidden sm:inline-block font-normal">
                      — {ep.summary}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {}
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/80 dark:bg-zinc-800/80 border border-gray-border text-text-sec">
                      {ep.auth}
                    </span>

                    {}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyCurl(ep);
                      }}
                      className="p-1.5 hover:bg-white/80 dark:hover:bg-zinc-800/80 rounded border border-transparent hover:border-gray-border text-text-ter hover:text-text-pri transition-all"
                      title="Copiar comando cURL"
                    >
                      {copiedCurlId === ep.id ? (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">¡cURL copiado!</span>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <polyline points="16 18 22 12 16 6" strokeWidth="2" />
                          <polyline points="8 6 2 12 8 18" strokeWidth="2" />
                        </svg>
                      )}
                    </button>

                    {}
                    <svg
                      className={`w-4 h-4 text-text-ter transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <polyline points="6 9 12 15 18 9" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                {}
                {isExpanded && (
                  <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1E29] space-y-5 text-xs">
                    {}
                    <div className="bg-surface rounded-lg p-4 border border-gray-border">
                      <div className="font-semibold text-text-pri text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                          <line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" />
                          <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2" />
                        </svg>
                        ¿Para qué sirve este endpoint?
                      </div>
                      <p className="text-text-sec leading-relaxed text-sm">{ep.description}</p>
                      <div className="mt-2 text-[11px] text-text-ter flex items-center gap-4">
                        <span><strong>Categoría:</strong> {ep.tag}</span>
                        <span><strong>Seguridad:</strong> {ep.auth}</span>
                      </div>
                    </div>

                    {}
                    {((ep.pathParams && ep.pathParams.length > 0) || (ep.queryParams && ep.queryParams.length > 0)) && (
                      <div>
                        <div className="font-semibold text-text-pri mb-2 text-xs uppercase tracking-wider">
                          Parámetros
                        </div>
                        <div className="border border-gray-border rounded-lg overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-border text-[11px] text-text-sec">
                                <th className="py-2 px-3">Parámetro</th>
                                <th className="py-2 px-3">Tipo</th>
                                <th className="py-2 px-3">Ubicación</th>
                                <th className="py-2 px-3">Requerido</th>
                                <th className="py-2 px-3">Descripción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {ep.pathParams?.map((p) => (
                                <tr key={p.name} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                                  <td className="py-2 px-3 font-mono font-semibold text-text-pri">{p.name}</td>
                                  <td className="py-2 px-3 font-mono text-text-ter">{p.type}</td>
                                  <td className="py-2 px-3"><span className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded text-[10px]">path</span></td>
                                  <td className="py-2 px-3 text-rose-600 dark:text-rose-400 font-medium">Requerido</td>
                                  <td className="py-2 px-3 text-text-sec">{p.description}</td>
                                </tr>
                              ))}
                              {ep.queryParams?.map((p) => (
                                <tr key={p.name} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                                  <td className="py-2 px-3 font-mono font-semibold text-text-pri">{p.name}</td>
                                  <td className="py-2 px-3 font-mono text-text-ter">{p.type}</td>
                                  <td className="py-2 px-3"><span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded text-[10px]">query</span></td>
                                  <td className="py-2 px-3 text-text-ter">{p.required ? 'Sí' : 'Opcional'}</td>
                                  <td className="py-2 px-3 text-text-sec">{p.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {}
                    {ep.requestBody && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-text-pri text-xs uppercase tracking-wider">
                            Cuerpo de la Petición (Request Body)
                          </span>
                          <span className="font-mono text-[11px] text-text-ter bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                            {ep.requestBody.contentType}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-sec mb-2">{ep.requestBody.description}</div>
                        <div className="relative rounded-lg bg-gray-900 text-gray-100 p-3 font-mono text-xs overflow-x-auto border border-gray-800">
                          <pre>{JSON.stringify(ep.requestBody.example, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {}
                    <div>
                      <div className="font-semibold text-text-pri mb-2 text-xs uppercase tracking-wider">
                        Respuestas (Responses)
                      </div>
                      <div className="space-y-2">
                        {ep.responses.map((resp) => {
                          const is2xx = resp.status >= 200 && resp.status < 300;
                          return (
                            <div key={resp.status} className="border border-gray-border rounded-lg p-3 bg-surface">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                                      is2xx
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50'
                                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700/50'
                                    }`}
                                  >
                                    {resp.label}
                                  </span>
                                  <span className="text-text-pri font-medium">{resp.description}</span>
                                </div>
                              </div>
                              {resp.example && (
                                <div className="mt-2.5 rounded bg-gray-900 text-emerald-400 p-2.5 font-mono text-[11px] overflow-x-auto">
                                  <pre>{JSON.stringify(resp.example, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <span className="text-[11px] text-text-ter">
                        Usa este cURL para probar el endpoint en tu terminal o en un agente autónomo de IA.
                      </span>
                      <button
                        type="button"
                        onClick={() => copyCurl(ep)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-text-pri text-xs font-medium transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <polyline points="16 18 22 12 16 6" strokeWidth="2" />
                          <polyline points="8 6 2 12 8 18" strokeWidth="2" />
                        </svg>
                        {copiedCurlId === ep.id ? '¡cURL copiado!' : 'Copiar comando cURL'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
