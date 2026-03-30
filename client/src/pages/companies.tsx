import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  ExternalLink,
  RefreshCw,
  Globe,
} from "lucide-react";
import type { Company, ScrapeLog } from "@/lib/types";

export default function CompaniesPage() {
  const { toast } = useToast();

  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: logs } = useQuery<ScrapeLog[]>({
    queryKey: ["/api/scrape/logs"],
  });

  const scrapeAll = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/scrape");
    },
    onSuccess: () => {
      toast({ title: "Fetch started", description: "Collecting jobs from all companies..." });
      // Poll for updates
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/scrape/logs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      }, 5000);
    },
  });

  const scrapeOne = useMutation({
    mutationFn: async (companyId: number) => {
      await apiRequest("POST", `/api/scrape/${companyId}`);
    },
    onSuccess: (_data, companyId) => {
      const name = companies?.find((c) => c.id === companyId)?.name || "Company";
      toast({ title: "Fetch started", description: `Collecting jobs from ${name}...` });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/scrape/logs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      }, 5000);
    },
  });

  // Get last log per company
  const lastLogByCompany = new Map<number, ScrapeLog>();
  if (logs) {
    for (const log of logs) {
      if (!lastLogByCompany.has(log.companyId)) {
        lastLogByCompany.set(log.companyId, log);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 border border-border/50">
            <Skeleton className="h-5 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {companies?.length} tracked {companies?.length === 1 ? "company" : "companies"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scrapeAll.mutate()}
          disabled={scrapeAll.isPending}
          data-testid="btn-scrape-all"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${scrapeAll.isPending ? "animate-spin" : ""}`} />
          Fetch All Jobs
        </Button>
      </div>

      <div className="space-y-2">
        {companies?.map((company) => {
          const lastLog = lastLogByCompany.get(company.id);
          return (
            <Card
              key={company.id}
              data-testid={`card-company-${company.id}`}
              className="p-4 border border-border/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{company.name}</span>
                    {company.industry && (
                      <Badge variant="secondary" className="text-xs">{company.industry}</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{company.atsType}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <Globe className="h-3 w-3" /> Website
                      </a>
                    )}
                    {company.careersUrl && (
                      <a
                        href={company.careersUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> Careers
                      </a>
                    )}
                    {lastLog && (
                      <span>
                        Last fetch: {lastLog.status === "success" ? (
                          <span className="text-green-600 dark:text-green-400">
                            {lastLog.jobsFound} found, {lastLog.jobsNew} new
                          </span>
                        ) : lastLog.status === "error" ? (
                          <span className="text-red-500">Error</span>
                        ) : (
                          <span className="text-yellow-600">Running...</span>
                        )}
                        {lastLog.completedAt && ` \u00b7 ${new Date(lastLog.completedAt).toLocaleString()}`}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => scrapeOne.mutate(company.id)}
                  disabled={scrapeOne.isPending}
                  data-testid={`btn-scrape-${company.id}`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${scrapeOne.isPending ? "animate-spin" : ""}`} />
                  Fetch
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
