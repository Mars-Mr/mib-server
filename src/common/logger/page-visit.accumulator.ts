import { Injectable } from '@nestjs/common';

/** In-memory counters per normalized route key (e.g. `GET /students/:id`). */
@Injectable()
export class PageVisitAccumulatorService {
  private readonly counts = new Map<string, number>();

  increment(routeKey: string): number {
    const next = (this.counts.get(routeKey) ?? 0) + 1;
    this.counts.set(routeKey, next);
    return next;
  }

  peek(): Record<string, number> {
    return Object.fromEntries(this.counts);
  }
}
