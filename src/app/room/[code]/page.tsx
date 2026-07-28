"use client";

import { use } from "react";
import RoomClient from "@/components/room/RoomClient";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <RoomClient roomCode={code.toUpperCase()} />;
}
