export interface Session {
  playerId: string;
  roomId: string;
  roomCode: string;
}

function key(roomCode: string) {
  return `avalon:${roomCode.toUpperCase()}`;
}

export function saveSession(session: Session) {
  sessionStorage.setItem(key(session.roomCode), JSON.stringify(session));
}

export function loadSession(roomCode: string): Session | null {
  const raw = sessionStorage.getItem(key(roomCode));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession(roomCode: string) {
  sessionStorage.removeItem(key(roomCode));
}
