import { Player, Ranking, Division, Match, User } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Admin Usuario',
    email: 'superadmin@padelrank.pro',
    role: 'superadmin',
    clubName: 'Club Central Pádel',
    status: 'active'
  },
  {
    id: 'u2',
    name: 'Carlos Director',
    email: 'carlos@padelclub.com',
    role: 'admin',
    clubName: 'Pádel Club Norte',
    status: 'active'
  },
  {
    id: 'u3',
    name: 'Marta Organizadora',
    email: 'marta@tenisypadel.es',
    role: 'admin',
    clubName: 'Tenis y Pádel Sur',
    status: 'pending' // Pending approval
  },
  {
    id: 'u4',
    name: 'Juan Nuevo',
    email: 'juan@newclub.com',
    role: 'admin',
    clubName: 'Nuevo Club',
    status: 'pending'
  }
];

export const MOCK_PLAYERS: Record<string, Player> = {
  'p1': { id: 'p1', nombre: 'Juan', apellidos: 'García', email: 'juan@test.com', telefono: '600000001', stats: { pj: 10, pg: 6, pp: 4, winrate: 60 } },
  'p2': { id: 'p2', nombre: 'Pedro', apellidos: 'López', email: 'pedro@test.com', telefono: '600000002', stats: { pj: 10, pg: 6, pp: 4, winrate: 60 } },
  'p3': { id: 'p3', nombre: 'Ana', apellidos: 'Martín', email: 'ana@test.com', telefono: '600000003', stats: { pj: 10, pg: 4, pp: 6, winrate: 40 } },
  'p4': { id: 'p4', nombre: 'Luis', apellidos: 'Ruiz', email: 'luis@test.com', telefono: '600000004', stats: { pj: 10, pg: 4, pp: 6, winrate: 40 } },
  'p5': { id: 'p5', nombre: 'Carlos', apellidos: 'Sanz', email: 'carlos@test.com', telefono: '600000005', stats: { pj: 0, pg: 0, pp: 0, winrate: 0 } },
};

export const MOCK_MATCHES: Match[] = [
  {
    id: 'm1',
    jornada: 1,
    pair1: { p1Id: 'p1', p2Id: 'p2' },
    pair2: { p1Id: 'p3', p2Id: 'p4' },
    status: 'finalizado',
    points: { p1: 4, p2: 0 },
    score: {
      set1: { p1: 6, p2: 4 },
      set2: { p1: 4, p2: 2 },
      isIncomplete: true,
      finalizationType: 'victoria_incompleta',
      description: 'Victoria Incompleta (Ventaja)'
    }
  },
  {
    id: 'm2',
    jornada: 2,
    pair1: { p1Id: 'p1', p2Id: 'p3' },
    pair2: { p1Id: 'p2', p2Id: 'p4' },
    status: 'pendiente',
    points: { p1: 0, p2: 0 }
  },
  {
    id: 'm3',
    jornada: 3,
    pair1: { p1Id: 'p1', p2Id: 'p4' },
    pair2: { p1Id: 'p2', p2Id: 'p3' },
    status: 'pendiente',
    points: { p1: 0, p2: 0 }
  }
];

export const MOCK_DIVISION: Division = {
  id: 'd1',
  numero: 1,
  status: 'activa',
  players: ['p1', 'p2', 'p3', 'p4'],
  matches: MOCK_MATCHES
};

export const MOCK_RANKINGS: Ranking[] = [
  {
    id: 'r1',
    nombre: 'Torneo Primavera 2025',
    categoria: 'Mixto',
    fechaInicio: '2025-03-01',
    status: 'activo',
    divisions: [MOCK_DIVISION]
  },
  {
    id: 'r2',
    nombre: 'Liga Mensual - Nivel B',
    categoria: 'Masculino',
    fechaInicio: '2025-02-15',
    status: 'finalizado',
    divisions: [MOCK_DIVISION]
  }
];