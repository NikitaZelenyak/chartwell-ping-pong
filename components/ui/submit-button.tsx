"use client";

import { PendingContent } from "@/components/pending-content";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

type SubmitButtonProps = ButtonProps & {
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  disabled,
  pendingLabel = "Working…",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-busy={pending}
      disabled={disabled || pending}
      type="submit"
      {...props}
    >
      <PendingContent pending={pending} label={pendingLabel}>{children}</PendingContent>
    </Button>
  );
}
