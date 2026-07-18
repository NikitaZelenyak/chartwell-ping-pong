export const POST_BODY_MAX_LENGTH = 2000;
export const COMMENT_BODY_MAX_LENGTH = 1000;
export const VIDEO_URL_MAX_LENGTH = 2048;

export type VideoProvider =
  | "youtube"
  | "vimeo"
  | "tiktok"
  | "instagram"
  | "external";

export type PostReaction = "ping" | "pong";

export type ParsedVideo = {
  provider: VideoProvider;
  key: string | null;
  url: string;
  hostname: string;
};

export type PostFieldErrors = {
  body?: string;
  videoUrl?: string;
  form?: string;
};

export type PostActionState = {
  ok: boolean;
  message?: string;
  postId?: string;
  fieldErrors?: PostFieldErrors;
};

export const EMPTY_POST_ACTION_STATE: PostActionState = { ok: false };

export type ReactionActionResult = {
  ok: boolean;
  pingCount: number;
  pongCount: number;
  currentReaction: PostReaction | null;
  message?: string;
};

export type CommunityProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarStyle: string | null;
  avatarSeed: string | null;
};

export type CommunityComment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  timeLabel: string;
  author: CommunityProfile;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  body: string | null;
  videoUrl: string | null;
  videoProvider: VideoProvider | null;
  videoKey: string | null;
  createdAt: string;
  updatedAt: string;
  timeLabel: string;
  author: CommunityProfile;
  pingCount: number;
  pongCount: number;
  commentCount: number;
  currentReaction: PostReaction | null;
  recentComments: CommunityComment[];
};

type PostInputResult =
  | {
      ok: true;
      value: {
        body: string | null;
        video: ParsedVideo | null;
      };
    }
  | {
      ok: false;
      fieldErrors: PostFieldErrors;
    };

type CommentInputResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

function isHost(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function safePathSegment(value: string | undefined, pattern: RegExp) {
  return value && pattern.test(value) ? value : null;
}

export function parseVideoUrl(rawValue: string): ParsedVideo {
  const value = rawValue.trim();

  if (value.length > VIDEO_URL_MAX_LENGTH) {
    throw new Error(`Video links must be ${VIDEO_URL_MAX_LENGTH} characters or less.`);
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid video link.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Video links must use HTTPS.");
  }

  if (url.username || url.password) {
    throw new Error("Video links cannot include credentials.");
  }

  const hostname = url.hostname.toLowerCase();
  const path = url.pathname.split("/").filter(Boolean);
  const youtubeIdPattern = /^[A-Za-z0-9_-]{6,15}$/;
  const numericIdPattern = /^\d+$/;
  const socialIdPattern = /^[A-Za-z0-9_-]+$/;

  if (hostname === "youtu.be") {
    const key = safePathSegment(path[0], youtubeIdPattern);
    if (key) {
      return {
        provider: "youtube",
        key,
        url: `https://www.youtube.com/watch?v=${key}`,
        hostname: "youtube.com",
      };
    }
  }

  if (isHost(hostname, "youtube.com") || isHost(hostname, "youtube-nocookie.com")) {
    const candidate =
      url.pathname === "/watch"
        ? url.searchParams.get("v") ?? undefined
        : ["shorts", "embed", "live"].includes(path[0] ?? "")
          ? path[1]
          : undefined;
    const key = safePathSegment(candidate, youtubeIdPattern);

    if (key) {
      return {
        provider: "youtube",
        key,
        url: `https://www.youtube.com/watch?v=${key}`,
        hostname: "youtube.com",
      };
    }
  }

  if (isHost(hostname, "vimeo.com")) {
    const videoIndex = path[0] === "video" ? 1 : 0;
    const key = safePathSegment(path[videoIndex], numericIdPattern);

    if (key) {
      return {
        provider: "vimeo",
        key,
        url: `https://vimeo.com/${key}`,
        hostname: "vimeo.com",
      };
    }
  }

  if (isHost(hostname, "tiktok.com")) {
    const videoIndex = path.findIndex((segment) => segment === "video");
    const playerIndex = path.findIndex((segment) => segment === "v1");
    const key = safePathSegment(
      videoIndex >= 0 ? path[videoIndex + 1] : path[playerIndex + 1],
      numericIdPattern,
    );

    if (key) {
      url.hash = "";
      return {
        provider: "tiktok",
        key,
        url: url.toString(),
        hostname: "tiktok.com",
      };
    }
  }

  if (isHost(hostname, "instagram.com")) {
    const kind = path[0];
    const shortcode = safePathSegment(path[1], socialIdPattern);

    if (shortcode && ["p", "reel", "tv"].includes(kind ?? "")) {
      const normalizedKind = kind === "tv" ? "p" : kind;
      return {
        provider: "instagram",
        key: `${normalizedKind}:${shortcode}`,
        url: `https://www.instagram.com/${kind}/${shortcode}/`,
        hostname: "instagram.com",
      };
    }
  }

  url.hash = "";
  return {
    provider: "external",
    key: null,
    url: url.toString(),
    hostname,
  };
}

export function validatePostInput(
  rawBody: FormDataEntryValue | string | null,
  rawVideoUrl: FormDataEntryValue | string | null,
): PostInputResult {
  const body = String(rawBody ?? "").trim();
  const videoUrl = String(rawVideoUrl ?? "").trim();
  const fieldErrors: PostFieldErrors = {};

  if (body.length > POST_BODY_MAX_LENGTH) {
    fieldErrors.body = `Thoughts must be ${POST_BODY_MAX_LENGTH} characters or less.`;
  }

  let video: ParsedVideo | null = null;

  if (videoUrl) {
    try {
      video = parseVideoUrl(videoUrl);
    } catch (error) {
      fieldErrors.videoUrl =
        error instanceof Error ? error.message : "Enter a valid video link.";
    }
  }

  if (!body && !videoUrl) {
    fieldErrors.form = "Share a thought, a video link, or both.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      body: body || null,
      video,
    },
  };
}

export function validateCommentInput(
  rawBody: FormDataEntryValue | string | null,
): CommentInputResult {
  const body = String(rawBody ?? "").trim();

  if (!body) {
    return { ok: false, error: "Write a comment before posting." };
  }

  if (body.length > COMMENT_BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `Comments must be ${COMMENT_BODY_MAX_LENGTH} characters or less.`,
    };
  }

  return { ok: true, value: body };
}

export function isPostReaction(value: unknown): value is PostReaction {
  return value === "ping" || value === "pong";
}

export function isVideoProvider(value: unknown): value is VideoProvider {
  return (
    value === "youtube" ||
    value === "vimeo" ||
    value === "tiktok" ||
    value === "instagram" ||
    value === "external"
  );
}

export function formatRelativeTime(value: string, now = new Date()) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const intervals: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, size] of intervals) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }

  return formatter.format(seconds, "second");
}

export function displayCommunityProfile(
  profile: Pick<CommunityProfile, "displayName" | "email">,
) {
  return profile.displayName || profile.email || "Player";
}
