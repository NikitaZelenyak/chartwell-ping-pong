import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Check, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PingPongLoader } from "@/components/ping-pong-loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  avatarUrl,
  initialsAvatarColors,
  initialsForName,
  isInitialsAvatar,
  playerAvatarOptions,
  type AvatarOption,
} from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";
import { saveProfile } from "../actions";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  rating: number | null;
  wins: number | null;
  losses: number | null;
  preferred_hand: string | null;
  avatar_style: string | null;
  avatar_seed: string | null;
  bio: string | null;
};

const selectControlClass =
  "h-11 rounded-md border border-input bg-background px-3 text-base shadow-sm md:h-9 md:text-sm";

function displayPlayer(profile?: Profile | null, fallback = "Player") {
  if (!profile) {
    return fallback;
  }

  return profile.display_name || profile.email || fallback;
}

function ratingBand(rating: number | null) {
  const score = rating ?? 1000;

  if (score >= 1900) {
    return "Elite";
  }

  if (score >= 1500) {
    return "Advanced";
  }

  if (score >= 1200) {
    return "Club";
  }

  return "Rising";
}

async function loadProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,email,display_name,rating,wins,losses,preferred_hand,avatar_style,avatar_seed,bio",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile | null;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const profile = await loadProfile(user.id);
  const playerName = displayPlayer(profile, user.email ?? "Player");

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <section className="rounded-md border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarThumb
              styleName={profile?.avatar_style}
              seed={profile?.avatar_seed ?? user.id}
              label={playerName}
              className="size-16"
            />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Player profile</p>
              <h1 className="mt-2 break-words text-2xl font-semibold tracking-normal sm:text-3xl">
                {playerName}
              </h1>
            </div>
          </div>
          <Badge variant="secondary">{ratingBand(profile?.rating ?? null)}</Badge>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-sm sm:mt-6 sm:gap-3">
          <ProfileStat label="Rating" value={profile?.rating ?? 1000} />
          <ProfileStat label="Wins" value={profile?.wins ?? 0} />
          <ProfileStat label="Losses" value={profile?.losses ?? 0} />
        </div>
      </section>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <UserRound className="size-5" />
            Edit profile
          </CardTitle>
          <CardDescription>
            This profile is used for the leaderboard, tournament entry, and
            match invitations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveProfile} className="grid gap-4 md:grid-cols-2">
            <Field
              label="First and last name"
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
            />
            <div className="grid gap-2">
              <Label htmlFor="preferred_hand">Preferred hand</Label>
              <select
                id="preferred_hand"
                name="preferred_hand"
                defaultValue={profile?.preferred_hand ?? ""}
                className={selectControlClass}
              >
                <option value="">Choose</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="ambidextrous">Ambidextrous</option>
              </select>
            </div>
            <AvatarPicker
              label="Avatar"
              options={playerAvatarOptions}
              selectedStyle={profile?.avatar_style}
              selectedSeed={profile?.avatar_seed}
              initialsName={profile?.display_name ?? user.email ?? "Player"}
              initialsSeed={profile?.avatar_seed ?? user.id}
              className="md:col-span-2"
            />
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={profile?.bio ?? ""}
                placeholder="Short playing style, availability, or favorite format."
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">
                <Check className="size-4" />
                Save profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileFallback() {
  return <PingPongLoader label="Loading profile..." className="sm:min-h-[24rem]" />;
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold sm:text-2xl">{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  ...props
}: {
  label: string;
  name: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} {...props} />
    </div>
  );
}

function AvatarThumb({
  styleName,
  seed,
  label,
  className,
}: {
  styleName: string | null | undefined;
  seed: string | null | undefined;
  label: string;
  className?: string;
}) {
  if (isInitialsAvatar(styleName)) {
    const colors = initialsAvatarColors(seed ?? label);

    return (
      <div
        aria-label={`${label} initials avatar`}
        className={`grid shrink-0 place-items-center rounded-md border font-semibold text-white shadow-sm ${className ?? "size-12"}`}
        role="img"
        style={colors}
      >
        <span className="text-[clamp(0.75rem,32%,1.8rem)]">
          {initialsForName(label)}
        </span>
      </div>
    );
  }

  return (
    <div
      aria-label={`${label} avatar`}
      className={`shrink-0 rounded-md border bg-accent bg-cover bg-center shadow-sm ${className ?? "size-12"}`}
      role="img"
      style={{
        backgroundImage: `url("${avatarUrl(styleName, seed)}")`,
      }}
    />
  );
}

function AvatarPicker({
  label,
  options,
  selectedStyle,
  selectedSeed,
  initialsName = "Chartwell Player",
  initialsSeed = "chartwell-player",
  className,
}: {
  label: string;
  options: AvatarOption[];
  selectedStyle?: string | null;
  selectedSeed?: string | null;
  initialsName?: string;
  initialsSeed?: string;
  className?: string;
}) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) =>
      isInitialsAvatar(option.style)
        ? option.style === selectedStyle
        : option.style === selectedStyle && option.seed === selectedSeed,
    ),
  );

  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      <div className="grid max-h-[28rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6">
        {options.map((option, index) => {
          const optionSeed = isInitialsAvatar(option.style)
            ? initialsSeed
            : option.seed;
          const optionLabel = isInitialsAvatar(option.style)
            ? initialsName
            : option.label;

          return (
            <label
              className="group cursor-pointer rounded-md border bg-background p-2 shadow-sm transition hover:border-primary/60 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:ring-1 has-[:checked]:ring-primary"
              key={`${option.style}-${option.seed}`}
            >
              <input
                className="sr-only"
                defaultChecked={index === selectedIndex}
                name="avatar_choice"
                type="radio"
                value={`${option.style}|${optionSeed}`}
              />
              <AvatarThumb
                styleName={option.style}
                seed={optionSeed}
                label={optionLabel}
                className="aspect-square w-full"
              />
              <span className="mt-2 block truncate text-center text-xs font-medium">
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
