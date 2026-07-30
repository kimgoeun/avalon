"use client";

import { use } from "react";
import RoomClient from "@/components/liar-game/RoomClient";

export default function LiarGameRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <RoomClient roomCode={code.toUpperCase()} />;
}
