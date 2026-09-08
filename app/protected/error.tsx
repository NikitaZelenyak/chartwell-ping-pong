"use client";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProtectedError({ reset }: { reset: () => void }) {
  return <section className="season-panel mx-auto w-full max-w-xl p-7">
    <h1 className="text-2xl font-semibold">Let’s get you back to the table</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">We couldn’t complete this request. Refresh to load the latest season and match status. If a season just closed, its pending reports can no longer be confirmed.</p>
    <div className="mt-5 flex flex-wrap gap-3"><Button onClick={reset}><RefreshCw /> Try again</Button><Button variant="outline" asChild><Link href="/protected/seasons">Season center</Link></Button></div>
  </section>;
}
