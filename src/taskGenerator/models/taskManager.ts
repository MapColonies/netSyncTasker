import { inject, singleton } from 'tsyringe';
import { Feature, MultiPolygon, Polygon } from '@turf/turf';
import { degreesPerPixelToZoomLevel, ILogger } from '@map-colonies/mc-utils';
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
    private readonly jobsClient: JobManagerClient,
    @inject(Services.LOGGER) private readonly logger: ILogger
  ) {
    this.batchSize = config.get<number>('batchSize');
  }

  public async createBatchedTasks(resourceId: string, resourceVersion: string, jobId: string, layerRelativePath: string): Promise<void> {
    const logData = `job: ${jobId}, id: ${resourceId}, version: ${resourceVersion}, layerRelativePath: ${layerRelativePath}`;
    this.logger.info(`create batched tiles tasks for ${logData}`);
    const layer = await this.catalog.getDiscreteMetadata(resourceId, resourceVersion);
    const footprint = layer.metadata?.footprint as Polygon | Feature<Polygon> | Feature<MultiPolygon>;
    const zoomLevel = degreesPerPixelToZoomLevel(layer.metadata?.resolution as number);
    const batchGen = this.batcher.tileBatchGenerator(this.batchSize, footprint, zoomLevel);
    for (const batch of batchGen) {
      const parameters = {
        batch,
        resourceId,
        resourceVersion,
        layerRelativePath,
      };
      const exists = await this.taskExists(jobId, parameters);
      if (exists) {
        this.logger.info(`skipping creation of existing batch for ${logData}, batch: ${JSON.stringify(batch)}`);
        continue;
      }
      await this.jobsClient.enqueueTask(jobId, {
        parameters,
      });
    }
  }

  private async taskExists(jobId: string, parameters: Record<string, unknown>): Promise<boolean> {
    const criteria = {
      jobId,
      parameters,
    };
    const tasks = await this.jobsClient.findTasks(criteria);
    return tasks != undefined && tasks.length > 0;
  }
}
