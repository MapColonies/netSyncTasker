import { inject, singleton } from 'tsyringe';
import { Feature, MultiPolygon, Polygon } from '@turf/turf';
import { degreesPerPixelToZoomLevel, ILogger, TileRanger, tileBatchGenerator } from '@map-colonies/mc-utils';
import { JobManagerClient } from '@map-colonies/mc-priority-queue';
import { CatalogClient } from '../../clients/catalogClient';
import { Services } from '../../common/constants';
import { IConfig } from '../../common/interfaces';

@singleton()
export class TaskManager {
  private readonly batchSize: number;
  private readonly taskType: string;

  public constructor(
    private readonly catalog: CatalogClient,
    private readonly ranger: TileRanger,
    @inject(Services.CONFIG) config: IConfig,
    private readonly jobsClient: JobManagerClient,
    @inject(Services.LOGGER) private readonly logger: ILogger
  ) {
    this.batchSize = config.get<number>('batchSize');
    this.taskType = config.get<string>('serviceClients.taskType');
  }

  public async createBatchedTasks(
    resourceId: string,
    resourceVersion: string,
    jobId: string,
    layerRelativePath: string,
    target: string
  ): Promise<void> {
    const logData = `job: ${jobId}, id: ${resourceId}, version: ${resourceVersion}, layerRelativePath: ${layerRelativePath}, target: ${target}`;
    this.logger.info(`create batched tiles tasks for ${logData}`);
    const layer = await this.catalog.getDiscreteMetadata(resourceId, resourceVersion);
    const footprint = layer.metadata?.footprint as Polygon | Feature<Polygon> | Feature<MultiPolygon>;
    const maxZoomLevel = degreesPerPixelToZoomLevel(layer.metadata?.maxResolutionDeg as number);
    for (let zoomLevel = 0; zoomLevel <= maxZoomLevel; zoomLevel++) {
      this.logger.debug(`Creating tile batch for zoom level ${zoomLevel}`);
      const rangeGen = this.ranger.encodeFootprint(footprint, zoomLevel);
      const batchGen = tileBatchGenerator(this.batchSize, rangeGen);
      for (const batch of batchGen) {
        const parameters = {
          batch,
          resourceId,
          resourceVersion,
          layerRelativePath,
          target,
        };
        const exists = await this.taskExists(jobId, parameters);
        if (exists) {
          this.logger.info(`skipping creation of existing batch for ${logData}, batch: ${JSON.stringify(batch)}`);
          continue;
        }
        await this.jobsClient.enqueueTask(jobId, {
          type: this.taskType,
          parameters,
        });
      }
    }
  }

  private async taskExists(jobId: string, parameters: Record<string, unknown>): Promise<boolean> {
    const criteria = {
      jobId,
      type: this.taskType,
      parameters,
    };
    const tasks = await this.jobsClient.findTasks(criteria);
    return tasks != undefined && tasks.length > 0;
  }
}
