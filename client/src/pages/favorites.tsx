import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  ExternalLink,
  MapPin,
  Building2,
  Briefcase,
  Heart,
} from "lucide-react";
import type { JobWithCompany } from "@/lib/types";

export default function FavoritesPage() {
  const { data: favorites, isLoading } = useQuery<JobWithCompany[]>({
    queryKey: ["/api/favorites"],
  });

  const removeFav = useMutation({
    mutationFn: async (favId: number) => {
      await apiRequest("DELETE", `/api/favorites/${favId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 border border-border/50">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <Card className="p-12 text-center border border-border/50">
        <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No favorites yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Star jobs from the browse page to save them here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        {favorites.length} saved {favorites.length === 1 ? "job" : "jobs"}
      </p>
      {favorites.map((job) => (
        <Card
          key={job.id}
          data-testid={`card-fav-${job.id}`}
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
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => job.favoriteId && removeFav.mutate(job.favoriteId)}
                data-testid={`btn-unfav-${job.id}`}
              >
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              </Button>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
