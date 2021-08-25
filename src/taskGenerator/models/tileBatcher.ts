import { singleton } from 'tsyringe';
import { ITileRange, TileRanger } from '@map-colonies/mc-utils';
import { Feature, MultiPolygon, Polygon } from '@turf/turf';

@singleton()
export class TileBatcher {
  public constructor(private readonly tileRanger: TileRanger) {}

  public *tileBatchGenerator(batchSize: number, polygon: Polygon | Feature<Polygon | MultiPolygon>, tileZoom: number): Generator<ITileRange[]> {
    const tileRangeGen = this.tileRanger.encodeFootprint(polygon, tileZoom);
    let ranges: ITileRange[] = [];
    let requiredForFullBatch = batchSize;
    for (const range of tileRangeGen) {
      const dx = range.maxX - range.minX;
      let dy = range.maxY - range.minY;
      if (dx === 0 || dy === 0) {
        continue;
      }
      let reminderX = range.maxX;
      while (range.minY < range.maxY) {
        if (reminderX < range.maxX) {
          const remaining = range.maxX - reminderX;
          if (remaining >= requiredForFullBatch) {
            ranges.push({
              minX: reminderX,
              maxX: reminderX + requiredForFullBatch,
              minY: range.minY,
              maxY: range.minY + 1,
              zoom: tileZoom,
            });
            yield ranges;
            reminderX += requiredForFullBatch;
            ranges = [];
            requiredForFullBatch = batchSize;
            continue;
          } else {
            ranges.push({
              minX: reminderX,
              maxX: reminderX + remaining,
              minY: range.minY,
              maxY: range.minY + 1,
              zoom: tileZoom,
            });
            range.minY++;
            reminderX += remaining;
            requiredForFullBatch -= remaining;
            dy--;
          }
        }
        const requiredLines = Math.floor(requiredForFullBatch / dx);
        const yRange = Math.min(requiredLines, dy);
        if (yRange > 0) {
          ranges.push({
            minX: range.minX,
            maxX: range.maxX,
            minY: range.minY,
            maxY: range.minY + yRange,
            zoom: tileZoom,
          });
          range.minY += yRange;
          dy -= yRange;
          requiredForFullBatch -= yRange * dx;
        }
        if (requiredForFullBatch > 0 && range.minY < range.maxY) {
          const endX = Math.min(range.minX + requiredForFullBatch, range.maxX);
          ranges.push({
            minX: range.minX,
            maxX: endX,
            minY: range.minY,
            maxY: range.minY + 1,
            zoom: tileZoom,
          });
          requiredForFullBatch -= endX - range.minX;
          if (endX < range.maxX) {
            reminderX = endX;
          } else {
            range.minY++;
          }
        }
        if (requiredForFullBatch === 0) {
          yield ranges;
          ranges = [];
          requiredForFullBatch = batchSize;
        }
      }
    }
    if (ranges.length > 0) {
      yield ranges;
    }
  }
}
