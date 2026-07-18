"use client";

import { Camera, ImagePlus, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

import { uploadProfilePhoto } from "@/app/protected/actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  canUseCustomPhoto,
  CUSTOM_PHOTO_ACHIEVEMENT_MINIMUM,
} from "@/lib/avatars";

export function ProfilePhotoUpload({
  achievementCount,
  currentPhotoUrl,
}: {
  achievementCount: number;
  currentPhotoUrl?: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const unlocked = canUseCustomPhoto(achievementCount);
  const achievementsRemaining = Math.max(
    0,
    CUSTOM_PHOTO_ACHIEVEMENT_MINIMUM - achievementCount,
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <Card className="overflow-hidden rounded-md shadow-sm">
      <CardHeader className="border-b bg-primary/[0.04]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Camera className="size-5" />
              Personal profile photo
            </CardTitle>
            <CardDescription className="mt-1.5">
              A special profile reward for the club&apos;s most accomplished
              players.
            </CardDescription>
          </div>
          <Badge variant={unlocked ? "default" : "secondary"}>
            {unlocked ? "Unlocked" : `${achievementCount} / 16`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {unlocked ? (
          <form
            action={uploadProfilePhoto}
            className="grid gap-5 sm:grid-cols-[7rem_1fr] sm:items-center"
          >
            <div
              aria-label={
                previewUrl
                  ? "Selected profile photo preview"
                  : currentPhotoUrl
                    ? "Current personal profile photo"
                    : "Profile photo placeholder"
              }
              className="relative mx-auto grid aspect-square w-28 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-primary/25 bg-primary/5 bg-cover bg-center text-primary sm:mx-0"
              role="img"
              style={
                previewUrl || currentPhotoUrl
                  ? {
                      backgroundImage: `url("${previewUrl ?? currentPhotoUrl}")`,
                    }
                  : undefined
              }
            >
              {!previewUrl && !currentPhotoUrl ? (
                <ImagePlus className="size-8" />
              ) : null}
            </div>

            <div className="grid min-w-0 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="profile_photo">
                  {currentPhotoUrl ? "Replace your photo" : "Choose your photo"}
                </Label>
                <Input
                  accept="image/jpeg,image/png,image/webp"
                  className="cursor-pointer file:mr-3 file:cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
                  id="profile_photo"
                  name="profile_photo"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                    }

                    setPreviewUrl(null);
                    setFileError(null);

                    if (!file) {
                      return;
                    }

                    if (
                      !["image/jpeg", "image/png", "image/webp"].includes(
                        file.type,
                      )
                    ) {
                      setFileError("Choose a JPG, PNG, or WebP image.");
                      event.target.value = "";
                      return;
                    }

                    if (file.size > 5 * 1024 * 1024) {
                      setFileError("Your photo must be 5 MB or smaller.");
                      event.target.value = "";
                      return;
                    }

                    setPreviewUrl(URL.createObjectURL(file));
                  }}
                  required
                  type="file"
                />
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                JPG, PNG, or WebP. Maximum 5 MB. Square photos work best. Your
                photo will be visible on your public player card.
              </p>
              {fileError ? (
                <p className="text-sm text-destructive" role="alert">
                  {fileError}
                </p>
              ) : null}
              <SubmitButton
                className="w-full sm:w-fit"
                disabled={Boolean(fileError)}
                pendingLabel="Uploading photo…"
              >
                <ImagePlus />
                {currentPhotoUrl ? "Replace photo" : "Use this photo"}
              </SubmitButton>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed bg-muted/30 p-6 text-center sm:flex-row sm:text-left">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <LockKeyhole className="size-5" />
            </span>
            <div>
              <p className="font-medium">
                Earn {achievementsRemaining} more achievement
                {achievementsRemaining === 1 ? "" : "s"} to add your own photo.
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Personal photos unlock once you have more than 15 achievements.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
