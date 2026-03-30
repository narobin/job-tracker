import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Star,
  StarOff,
  ExternalLink,
  MapPin,
  Building2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import type { JobsResponse, Company, JobWithCompany } from "@/lib/types";

const EMPLOYMENT_TYPES = ["Intern", "Co-op", "New Grad", "Regular", "Full-time"];

function JobCard({ job, onToggleFavorite }: { job: JobWithCompany; onToggleFavorite: (job: JobWithCompany) => void }) {
  return (
    <Card
      data-testid={`card-job-${job.id}`}
      className="p-4 hover-elevate border border-border/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate"
              data-testid={`link-job-${job.id}`}
            >
              {job.title}
            </a>
            {job.status === "closed" && (
              <Badge variant="destructive" className="text-xs shrink-0">Closed</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {job.company.name}
            </span>
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            )}
            {job.employmentType && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {job.employmentType}
              </span>
            )}
            {job.department && (
              <Badge variant="secondary" className="text-xs">{job.department}</Badge>
            )}
          </div>
          {job.postedAt && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Posted: {new Date(job.postedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onToggleFavorite(job)}
            data-testid={`btn-fav-${job.id}`}
          >
            {job.isFavorite ? (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
            data-testid={`link-ext-${job.id}`}
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </div>
    </Card>
  );
}

export default function JobsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("open");
  const [employmentType, setEmploymentType] = useState<string>("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 25;

  // Debounce search
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Fetch companies for filter
  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Build query params
  const params = new URLSearchParams();
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (selectedCompanies.length > 0) params.set("companyIds", selectedCompanies.join(","));
  if (status) params.set("status", status);
  if (employmentType) params.set("employmentType", employmentType);
  params.set("page", String(page));
  params.set("limit", String(limit));

  const { data, isLoading } = useQuery<JobsResponse>({
    queryKey: ["/api/jobs", `?${params.toString()}`],
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  // Favorite mutations
  const addFav = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("POST", "/api/favorites", { jobPostingId: jobId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const removeFav = useMutation({
    mutationFn: async (favId: number) => {
      await apiRequest("DELETE", `/api/favorites/${favId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const handleToggleFavorite = (job: JobWithCompany) => {
    if (job.isFavorite && job.favoriteId) {
      removeFav.mutate(job.favoriteId);
    } else {
      addFav.mutate(job.id);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCompanies([]);
    setStatus("open");
    setEmploymentType("");
    setPage(1);
  };

  const hasActiveFilters = debouncedSearch || selectedCompanies.length > 0 || status !== "open" || employmentType;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            type="search"
            placeholder="Search jobs by title, company, location..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          data-testid="btn-toggle-filters"
        >
          <Filter className="h-4 w-4" />
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="btn-clear-filters">
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-3 border border-border/50">
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Company</label>
              <Select
                value={selectedCompanies[0] || "all"}
                onValueChange={(v) => {
                  setSelectedCompanies(v === "all" ? [] : [v]);
                  setPage(1);
                }}
              >
                <SelectTrigger data-testid="select-company" className="h-9 text-sm">
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All companies</SelectItem>
                  {companies?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger data-testid="select-status" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <Select
                value={employmentType || "all"}
                onValueChange={(v) => { setEmploymentType(v === "all" ? "" : v); setPage(1); }}
              >
                <SelectTrigger data-testid="select-type" className="h-9 text-sm">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total.toLocaleString()} jobs found` : "Loading..."}
        </p>
      </div>

      {/* Job list */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4 border border-border/50">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))
        ) : data?.jobs.length === 0 ? (
          <Card className="p-8 text-center border border-border/50">
            <p className="text-muted-foreground">No jobs found matching your filters.</p>
          </Card>
        ) : (
          data?.jobs.map((job) => (
            <JobCard key={job.id} job={job} onToggleFavorite={handleToggleFavorite} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            data-testid="btn-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            data-testid="btn-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
