import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, CalendarDays, CalendarPlus, HelpCircle, LayoutGrid, Settings2, Sparkles, RotateCcw, LogOut, Lock } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoginScreen } from "@/components/LoginScreen";
import { HowItWorksModal } from "@/components/HowItWorksModal";
import { SCENARIOS, useBridalStore } from "@/store/useBridalStore";
import { cn } from "@/lib/utils";

const CLIENT_NAV = [
  { to: "/timeline", label: "My countdown", Icon: CalendarDays },
  { to: "/reminders", label: "Reminders", Icon: Bell },
  { to: "/export", label: "Calendar", Icon: CalendarPlus },
] as const;
const CLINIC_NAV = [
  { to: "/clinic", label: "Dashboard", Icon: LayoutGrid },
  { to: "/", label: "New plan", Icon: Sparkles },
  { to: "/timeline", label: "Bride plan", Icon: CalendarDays },
  { to: "/reminders", label: "Reminders", Icon: Bell },
] as const;
const useNav = () => (useBridalStore((s) => s.role) === "clinic" ? CLINIC_NAV : CLIENT_NAV);

export function BottomNav() {
  const NAV = useNav();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-flow-col auto-cols-fr">
        {NAV.map(({ to, label, Icon }) => {
          const active = path === to;
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5", active && "text-gold")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Sidebar() {
  const NAV = useNav();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-5 md:flex">
      <Brand />
      <nav aria-label="Main" className="mt-8 space-y-1">
        {NAV.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              path === to ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:bg-card/60",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </Link>
        ))}
      </nav>
      <p className="mt-auto text-xs text-muted-foreground">ORRO Wellness · Bridal Atelier</p>
    </aside>
  );
}

function Brand() {
  const role = useBridalStore((s) => s.role);
  return (
    <Link to={role === "clinic" ? "/clinic" : "/timeline"} className="flex items-baseline gap-2">
      <span className="font-display text-2xl font-bold tracking-wide text-primary">ORRO</span>
      <span className="text-[11px] uppercase tracking-[0.2em] text-gold">Bridal Countdown</span>
    </Link>
  );
}

function TopBar() {
  const [how, setHow] = useState(false);
  const navigate = useNavigate();
  const { loadScenario, reset, role, logout } = useBridalStore();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-8">
      <div className="md:hidden">
        <Brand />
      </div>
      <span className="ml-auto rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-primary md:ml-0">
        {role === "clinic" ? "Clinic staff" : "Bride"}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setHow(true)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="How it works">
          <HelpCircle className="h-5 w-5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Settings and demo scenarios">
            <Settings2 className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl">
            {role === "clinic" && <DropdownMenuLabel>Demo scenarios (adds a bride)</DropdownMenuLabel>}
            {role === "clinic" && SCENARIOS.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => {
                  loadScenario(s.id);
                  toast.success(`Loaded: ${s.label}`);
                  navigate({ to: role === "clinic" ? "/clinic" : "/timeline" });
                }}
              >
                {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setHow(true)}>How it works</DropdownMenuItem>
            {role === "clinic" && <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                reset();
                toast("Demo reset. Start a fresh plan.");
                navigate({ to: role === "clinic" ? "/" : "/timeline" });
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reset demo
            </DropdownMenuItem>}
            <DropdownMenuItem
              onClick={() => {
                logout();
                toast("Signed out.");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <HowItWorksModal open={how} onOpenChange={setHow} />
    </header>
  );
}

const STAFF_ONLY = ["/", "/clinic"];

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useBridalStore((s) => s.hydrated);
  const role = useBridalStore((s) => s.role);
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (hydrated && !role) return <LoginScreen />;
  const blocked = role === "client" && STAFF_ONLY.includes(path);
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-12">
          {hydrated && blocked ? (
            <div className="rounded-3xl border bg-soft p-8 text-center">
              <Lock className="mx-auto h-8 w-8 text-gold" aria-hidden />
              <h1 className="mt-3 text-2xl font-semibold">For clinic staff</h1>
              <p className="mt-2 text-sm text-muted-foreground">Your specialist builds your plan at consultation. Your countdown is waiting for you.</p>
              <Link to="/timeline" className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Go to my countdown</Link>
            </div>
          ) : hydrated ? (
            children
          ) : (
            <div className="space-y-4" aria-busy="true">
              <div className="h-32 animate-pulse rounded-2xl bg-muted" />
              <div className="h-20 animate-pulse rounded-2xl bg-muted" />
              <div className="h-20 animate-pulse rounded-2xl bg-muted" />
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
