export interface Session {
  playerId: string;
  roomId: string;
  roomCode: string;
}

function key(roomCode: string, game: string = "avalon") {
  return `${game}:${roomCode.toUpperCase()}`;
}

export function saveSession(session: Session, game: string = "avalon") {
  sessionStorage.setItem(key(session.roomCode, game), JSON.stringify(session));
}

export function loadSession(roomCode: string, game: string = "avalon"): Session | null {
  const raw = sessionStorage.getItem(key(roomCode, game));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession(roomCode: string, game: string = "avalon") {
  sessionStorage.removeItem(key(roomCode, game));
}
