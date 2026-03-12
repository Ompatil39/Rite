import { Flame, CheckCircle2 } from "lucide-react";

export const IconFire = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <Flame size={size} color={color} strokeWidth={1.8} />
);

export const IconClock = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <CheckCircle2 size={size} color={color} strokeWidth={1.8} />
);
