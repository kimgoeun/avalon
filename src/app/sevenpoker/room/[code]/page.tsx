"use client";

import { use } from "react";
import RoomClient from "@/components/sevenpoker/RoomClient";

export default function SevenPokerRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <RoomClient roomCode={code.toUpperCase()} />;
}
