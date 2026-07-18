import { ExternalLink, Play } from "lucide-react";

import type { VideoProvider } from "@/lib/posts";
import { cn } from "@/lib/utils";

function embedDetails(provider: VideoProvider, key: string | null) {
  if (!key) {
    return null;
  }

  if (provider === "youtube") {
    return {
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?playsinline=1`,
      title: "YouTube video player",
      vertical: false,
    };
  }

  if (provider === "vimeo") {
    return {
      src: `https://player.vimeo.com/video/${encodeURIComponent(key)}`,
      title: "Vimeo video player",
      vertical: false,
    };
  }

  if (provider === "tiktok") {
    return {
      src: `https://www.tiktok.com/player/v1/${encodeURIComponent(key)}?music_info=1&description=1`,
      title: "TikTok video player",
      vertical: true,
    };
  }

  if (provider === "instagram") {
    const [kind, shortcode] = key.split(":");
    if (!shortcode || !["p", "reel"].includes(kind)) {
      return null;
    }

    return {
      src: `https://www.instagram.com/${kind}/${encodeURIComponent(shortcode)}/embed`,
      title: "Instagram video player",
      vertical: true,
    };
  }

  return null;
}

export function VideoEmbed({
  provider,
  videoKey,
  url,
}: {
  provider: VideoProvider;
  videoKey: string | null;
  url: string;
}) {
  let hostname = "External link";

  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // The URL was validated before storage. Keep a useful fallback label.
  }

  const embed = embedDetails(provider, videoKey);

  if (!embed || provider === "external") {
    return (
      <a
        className="group flex items-center gap-3 rounded-md border bg-muted/30 p-4 transition-colors hover:border-primary/35 hover:bg-primary/5"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Play className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Open video link
          </span>
          <span className="mt-1 block truncate font-medium">{hostname}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {url}
          </span>
        </span>
        <ExternalLink className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </a>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border bg-muted/30">
      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden bg-black",
          embed.vertical ? "aspect-[9/14] max-w-[28rem]" : "aspect-video",
        )}
      >
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={embed.src}
          title={embed.title}
        />
      </div>
      <div className="flex items-center justify-between gap-3 border-t bg-card px-3 py-2 text-xs text-muted-foreground">
        <span className="truncate">{hostname}</span>
        <a
          className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
          href={url}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open original
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
