import { inject, singleton } from 'tsyringe';
import { Feature, MultiPolygon, Polygon } from '@turf/turf';
import { degreesPerPixelToZoomLevel } from '@map-colonies/mc-utils';
import { JobManagerClient } from '@map-colonies/mc-priority-queue';
import { CatalogClient } from '../../clients/catalogClient';
import { Services } from '../../common/constants';
import { IConfig } from '../../common/interfaces';
import { TileBatcher } from './tileBatcher';

@singleton()
export class TaskManager {
  private readonly batchSize: number;
  public constructor(
    private readonly catalog: CatalogClient,
    private readonly batcher: TileBatcher,
    @inject(Services.CONFIG) config: IConfig,
    private readonly jobsClient: JobManagerClient
  ) {
    this.batchSize = config.get<number>('batchSize');
  }

  public async createBatchedTasks(resourceId: string, resourceVersion: string, jobId: string): Promise<void> {
    const layer = await this.catalog.getDiscreteMetadata(resourceId, resourceVersion);
    const footPrint = layer.metadata?.footprint as Polygon | Feature<Polygon> | Feature<MultiPolygon>;
    const zoom = degreesPerPixelToZoomLevel(layer.metadata?.resolution as number);
    const batchGen = this.batcher.tileBatchGenerator(this.batchSize, footPrint, zoom);
    for (const batch of batchGen) {
      //TODO: check if task exists?
      const parameters = {
        batch,
        resourceId,
        resourceVersion,
      };

      await this.jobsClient.enqueueTask(jobId, {
        parameters,
      });
    }
  }
}
