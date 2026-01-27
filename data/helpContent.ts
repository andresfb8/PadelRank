
export interface HelpCategory {
    id: string;
    title: string;
    icon: string; // Icon name from lucide-react
}

export interface HelpArticle {
    id: string;
    categoryId: string;
    title: string;
    content: string; // Supports basic HTML/Markdown-like structure with line breaks
    tags: string[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
    { id: 'formats', title: 'Formatos de Torneo', icon: 'Trophy' },
    { id: 'admin', title: 'Gestión y Configuración', icon: 'Settings' },
    { id: 'players', title: 'Jugadores y Ranking', icon: 'Users' },
    { id: 'app', title: 'Sobre la App', icon: 'Info' },
];

export const HELP_ARTICLES: HelpArticle[] = [
    // Formatos
    {
        id: 'fmt-americano',
        categoryId: 'formats',
        title: '¿Qué es el formato Americano?',
        content: `
            <p>El formato <strong>Americano</strong> es ideal para torneos rápidos e individuales donde todos juegan con todos. El objetivo es sumar el máximo número de puntos individuales.</p>
            <h4 class="font-bold mt-2">Características Clave:</h4>
            <ul class="list-disc pl-4 mt-1 space-y-1">
                <li><strong>Parejas Rotativas:</strong> En cada partido cambias de compañero.</li>
                <li><strong>Puntos Individuales:</strong> Cada juego ganado suma un punto a tu casillero personal, independientemente de tu compañero.</li>
                <li><strong>Duración Fija:</strong> Se suele jugar por tiempo o a un número fijo de juegos (ej. 24 puntos).</li>
            </ul>
            <p class="mt-2 text-sm text-gray-500">Ejemplo: Si ganas un partido 20-10, sumas 20 puntos a tu ranking personal.</p>
        `,
        tags: ['americano', 'pozo', 'individual', 'rotativo']
    },
    {
        id: 'fmt-mexicano',
        categoryId: 'formats',
        title: '¿Qué es el formato Mexicano?',
        content: `
            <p>El <strong>Mexicano</strong> es una variante competitiva del Americano diseñada para igualar niveles automáticamente.</p>
            <h4 class="font-bold mt-2">¿Cómo funciona?</h4>
            <ul class="list-disc pl-4 mt-1 space-y-1">
                <li><strong>Partidos Nivelados:</strong> El sistema empareja a los jugadores basándose en sus puntos actuales: el 1º con el 3º contra el 2º y el 4º.</li>
                <li><strong>Dinámico:</strong> A medida que ganas, juegas contra mejores rivales. Si pierdes, bajas a mesas más asequibles.</li>
            </ul>
        `,
        tags: ['mexicano', 'pozo', 'nivelado', 'competitivo']
    },
    {
        id: 'fmt-hibrido',
        categoryId: 'formats',
        title: 'Torneo Híbrido (Grupos + Eliminatorias)',
        content: `
            <p>El formato <strong>Híbrido</strong> combina lo mejor de una fase de grupos con la emoción de un cuadro final.</p>
            <h4 class="font-bold mt-2">Fases:</h4>
            <ol class="list-decimal pl-4 mt-1 space-y-1">
                <li><strong>Fase de Grupos:</strong> Parejas fijas divididas en grupos (A, B, C...). Juegan todos contra todos dentro del grupo.</li>
                <li><strong>Clasificación:</strong> Los mejores de cada grupo (ej. los 2 primeros) pasan a la fase final.</li>
                <li><strong>Playoffs:</strong> Se genera automáticamente un cuadro eliminatorio (Cuartos, Semis, Final) cruzando a los clasificados (1º Grupo A vs 2º Grupo B).</li>
            </ol>
        `,
        tags: ['hibrido', 'grupos', 'champions', 'eliminatoria', 'bracket']
    },
    {
        id: 'fmt-league',
        categoryId: 'formats',
        title: 'Liga Regular (Round Robin)',
        content: `
            <p>La clásica liga de "todos contra todos". Se genera un calendario completo al inicio.</p>
            <p class="mt-2">Gana la pareja que más puntos acumule al final de todas las jornadas.</p>
        `,
        tags: ['liga', 'round robin', 'todos contra todos']
    },

    // Gestión
    {
        id: 'adm-create',
        categoryId: 'admin',
        title: 'Crear un Nuevo Torneo',
        content: `
            <p>Desde el <strong>Panel de Control</strong>, pulsa en "Nuevo Torneo".</p>
            <p class="mt-2">Sigue el asistente paso a paso:</p>
            <ul class="list-disc pl-4 mt-1">
                <li>Elige nombre y fecha.</li>
                <li>Selecciona el formato (ver sección Formatos).</li>
                <li>Añade jugadores desde tu base de datos o crea nuevos.</li>
                <li>Configura las opciones de puntuación.</li>
            </ul>
        `,
        tags: ['crear', 'nuevo', 'asistente', 'wizard']
    },
    {
        id: 'adm-match',
        categoryId: 'admin',
        title: 'Introducir Resultados',
        content: `
            <p>Para cerrar un partido:</p>
            <ol class="list-decimal pl-4 mt-1">
                <li>Ve a la pestaña <strong>Partidos</strong> de tu torneo.</li>
                <li>Pulsa sobre el partido pendiente.</li>
                <li>Introduce el marcador (ej. 6-4, 6-2).</li>
                <li>Pulsa "Guardar Resultado".</li>
            </ol>
            <p class="mt-2 text-sm text-yellow-600">Nota: Al guardar, la clasificación se recalcula automáticamente.</p>
        `,
        tags: ['resultados', 'marcador', 'partidos']
    },
    // Ranking
    {
        id: 'pl-import',
        categoryId: 'players',
        title: 'Importar Jugadores Masivamente',
        content: `
            <p>Si tienes una lista de Excel, puedes copiar y pegar los nombres directamente.</p>
            <p class="mt-2">Formato aceptado:</p>
            <pre class="bg-gray-100 p-2 rounded text-xs mt-1">Nombre Apellido\nNombre Apellido 2\n...</pre>
        `,
        tags: ['importar', 'excel', 'csv', 'masivo']
    },
    {
        id: 'lg-divisions',
        categoryId: 'formats',
        title: 'Ligas: Crear Divisiones',
        content: `
            <p>En los torneos de tipo Liga, puedes tener múltiples niveles (1ª División, 2ª División, etc.).</p>
            <h4 class="font-bold mt-2">Pasos para añadir una división:</h4>
            <ol class="list-decimal pl-4 mt-1 space-y-1">
                <li>Entra en el detalle de tu Liga.</li>
                <li>Pulsa el botón <strong>"Añadir División"</strong> en la cabecera.</li>
                <li>Asigna un nombre (Ej: "Grupo Oro").</li>
                <li>Selecciona los jugadores que formarán parte de esta nueva división.</li>
            </ol>
            <p class="mt-2 text-sm text-gray-500">Consejo: Puedes usar las divisiones para gestionar ascensos y descensos al final de la temporada.</p>
        `,
        tags: ['liga', 'divisiones', 'grupos', 'niveles']
    },
    {
        id: 'cfg-points',
        categoryId: 'admin',
        title: 'Sistema de Puntuación Personalizado',
        content: `
            <p>Puedes definir cuántos puntos suma un jugador/pareja según el resultado del partido.</p>
            <h4 class="font-bold mt-2">Configuración Habitual:</h4>
            <ul class="list-disc pl-4 mt-1 space-y-1">
                <li><strong>Victoria:</strong> Normalmente 3 puntos.</li>
                <li><strong>Empate:</strong> 1 punto (si el formato lo permite).</li>
                <li><strong>Derrota:</strong> 0 o 1 punto (para premiar la participación).</li>
            </ul>
            <p class="mt-2">Esta configuración se elige al crear el torneo, pero puedes editarla desde los Ajustes del mismo.</p>
        `,
        tags: ['puntos', 'victoria', 'configuracion', 'reglas']
    },
    {
        id: 'adm-edit-match',
        categoryId: 'admin',
        title: 'Corregir un Resultado',
        content: `
            <p>¿Te has equivocado al meter un marcador? No hay problema.</p>
            <p class="mt-2">Simplemente pulsa de nuevo sobre el partido finalizado, cambia los sets y vuelve a guardar. La clasificación se actualizará automáticamente restando los puntos antiguos y sumando los nuevos.</p>
        `,
        tags: ['editar', 'corregir', 'error', 'marcador']
    },
    {
        id: 'adm-substitutes',
        categoryId: 'players',
        title: 'Sustituciones y Lesiones',
        content: `
             <p>Si un jugador no puede jugar un partido, tienes varias opciones:</p>
             <ul class="list-disc pl-4 mt-1 space-y-2">
                 <li><strong>Sustituto:</strong> En torneos amistosos (Americano/Mexicano), puedes editar el nombre del jugador para ese partido específico o simplemente dejar que otro juegue en su lugar (los puntos irán al jugador original inscrito).</li>
                 <li><strong>W.O. (Lesión/No presentado):</strong> Puedes finalizar el partido como incompleto o asignar un resultado de 6-0, 6-0 si así lo estipulan tus normas.</li>
             </ul>
         `,
        tags: ['lesion', 'sustituto', 'wo', 'cambio']
    },
    // App
    {
        id: 'app-users',
        categoryId: 'app',
        title: 'Tipos de Usuario',
        content: `
            <ul class="list-disc pl-4 space-y-2">
                <li><strong>SuperAdmin:</strong> Control total del sistema.</li>
                <li><strong>Admin (Club):</strong> Puede crear y gestionar sus propios torneos y jugadores.</li>
                <li><strong>Jugador (Público):</strong> Solo puede ver los torneos y sus estadísticas, no puede editar nada.</li>
            </ul>
        `,
        tags: ['roles', 'permisos', 'usuarios']
    }
];
