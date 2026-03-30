import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import JobsPage from "@/pages/jobs";
import FavoritesPage from "@/pages/favorites";
import CompaniesPage from "@/pages/companies";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { useTheme } from "@/hooks/use-theme";
import {
  Briefcase,
  Star,
  Building2,
  Moon,
  Sun,
  Radar,
} from "lucide-react";
import type { Stats } from "@/lib/types";

function NavItem({
  href,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  icon: any;
  label: string;
  badge?: number;
}) {
  const [location] = useLocation();
  const isActive = location === href || (href === "/" && location === "");

  return (
    <Link href={href}>
      <button
        data-testid={`nav-${label.toLowerCase()}`}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm w-full transition-colors ${
          isActive
            ? "bg-primary text-primary-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
              isActive
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    </Link>
  );
}

function AppLayout() {
  const { theme, toggleTheme } = useTheme();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 10000,
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Job Tracker</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          <NavItem href="/" icon={Briefcase} label="Jobs" badge={stats?.openJobs} />
          <NavItem href="/favorites" icon={Star} label="Favorites" badge={stats?.favorites} />
          <NavItem href="/companies" icon={Building2} label="Companies" badge={stats?.totalCompanies} />
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground"
            onClick={toggleTheme}
            data-testid="btn-theme"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5 mr-2" />
            ) : (
              <Moon className="h-3.5 w-3.5 mr-2" />
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
          <PerplexityAttribution />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <Switch>
            <Route path="/" component={JobsPage} />
            <Route path="/favorites" component={FavoritesPage} />
            <Route path="/companies" component={CompaniesPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppLayout />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
