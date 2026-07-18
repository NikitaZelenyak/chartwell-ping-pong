import { PingPongLoader } from "@/components/ping-pong-loader";

export default function PostsLoading() {
  return <PingPongLoader className="sm:min-h-[34rem]" label="Loading community posts…" />;
}
