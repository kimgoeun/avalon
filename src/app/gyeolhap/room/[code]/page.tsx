"use client";

import { use } from "react";
import RoomClient from "@/components/gyeolhap/RoomClient";

export default function GyeolhapRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <RoomClient roomCode={code.toUpperCase()} />;
}
