import { PingPongLoader } from "@/components/ping-pong-loader";

export default function ProtectedLoading() {
  return (
    <PingPongLoader
      className="min-h-[55vh] border-primary/20 bg-card/70 shadow-sm sm:min-h-[65vh]"
      label="Updating the scoreboard…"
    />
  );
}
