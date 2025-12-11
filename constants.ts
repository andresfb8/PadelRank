import { Player, Ranking, Division, Match, User } from './types';

export const MOCK_USERS: User[] = [];

export const MOCK_PLAYERS: Record<string, Player> = {};

export const MOCK_MATCHES: Match[] = [];

export const MOCK_DIVISION: Division = {
  id: 'd1',
  numero: 1,
  status: 'activa',
  players: [],
  matches: []
};

export const MOCK_RANKINGS: Ranking[] = [];