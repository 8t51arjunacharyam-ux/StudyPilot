import { Gauge } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

/**
 * DifficultyDebtCard — subjects whose risk is building up.
 */
export function DifficultyDebtCard({ items }: { items: Array<{
  id: string;
  subjectName: string;
  color: string;
  debtScore: number;
  reason: string;
}> }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-2.5">
            <Gauge className="size-4 text-warning" aria-hidden="true" />
            <CardTitle>Difficulty debt</CardTitle>
          </div>
          <span className="text-xs text-muted">Highest risk first</span>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">All on track! No subjects are building up difficulty debt.</p>
        </CardContent>
        <CardFooter>
          <ButtonLink href="/progress" variant="ghost" size="sm">
            View breakdown
          </ButtonLink>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <Gauge className="size-4 text-warning" aria-hidden="true" />
          <CardTitle>Difficulty debt</CardTitle>
        </div>
        <span className="text-xs text-muted">Highest risk first</span>
      </CardHeader>

      <CardContent>
        <ul className="space-y-4">
          {items.map((item) => {
            const tone =
              item.debtScore >= 75 ? "danger" : item.debtScore >= 55 ? "warning" : "primary";

            return (
              <li key={item.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-medium">
                      {item.subjectName}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold tabular-nums ${
                      tone === "danger"
                        ? "text-danger"
                        : tone === "warning"
                          ? "text-warning"
                          : "text-primary"
                    }`}
                  >
                    {item.debtScore}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={`h-full rounded-full ${
                      tone === "danger"
                        ? "bg-danger"
                        : tone === "warning"
                          ? "bg-warning"
                          : "bg-primary"
                    }`}
                    style={{ width: `${item.debtScore}%` }}
                  />
                </div>

                <p className="text-xs leading-relaxed text-subtle">{item.reason}</p>
              </li>
            );
          })}
        </ul>
      </CardContent>

      <CardFooter>
        <ButtonLink href="/progress" variant="ghost" size="sm">
          View breakdown
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}