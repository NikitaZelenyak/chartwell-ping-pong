import Link from "@/components/arcade-link";
import { RallyCourt } from "@/components/rally-court";
import { PinPongMark } from "@/components/pinpong-mark";
import { ThemeSwitcher } from "@/components/theme-switcher";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-shell flex flex-col">
    <nav className="mx-auto flex w-full max-w-6xl items-center justify-between p-5"><Link href="/" className="flex items-center gap-2 font-bold"><PinPongMark />Chartwell Ping Pong</Link><ThemeSwitcher /></nav>
    <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-10 lg:grid-cols-2 lg:gap-20">
      <section className="auth-intro hidden lg:block"><p className="season-eyebrow">Welcome to the arena</p><h1 className="mt-5 text-6xl font-black leading-[1.05]">Great matches<br />start here.</h1><p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">Find your rivals. Build your team. Write your next season.</p><RallyCourt className="mt-8 w-full max-w-md" /></section>
      <div className="w-full">{children}</div>
    </div>
  </main>;
}
