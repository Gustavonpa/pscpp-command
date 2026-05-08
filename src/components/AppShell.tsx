import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardCheck, BookOpen, CalendarRange, LogOut, Target, Moon, Upload, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const links = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/checkin", label: "Check-in", icon: ClipboardCheck },
    { to: "/study", label: "Estudo", icon: BookOpen },
    { to: "/review", label: "Revisão", icon: CalendarRange },
    { to: "/garmin-sleep", label: "Sono", icon: Moon },
    { to: "/garmin-trainings", label: "Treinos", icon: Activity },
    { to: "/import-garmin", label: "Importar", icon: Upload },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Target className="h-5 w-5 text-primary" />
            <span>PSCPP <span className="text-muted-foreground font-normal">Command Center</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                activeProps={{ className: "px-3 py-1.5 rounded-md text-sm bg-accent text-foreground" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <nav className="md:hidden border-t border-border flex">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
                activeProps={{ className: "flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] text-primary" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
