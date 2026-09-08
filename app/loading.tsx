import { PingPongLoader } from "@/components/ping-pong-loader";

export default function Loading() {
  return (
    <main className="court-stripes grid min-h-screen place-items-center p-4">
      <PingPongLoader variant="page"
        className="min-h-[22rem] w-full max-w-2xl border-primary/20 bg-card/70 shadow-sm sm:min-h-[30rem]"
        label="Getting the table ready…"
      />
    </main>
  );
}
