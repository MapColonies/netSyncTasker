import { inject, singleton } from 'tsyringe';
import { Feature, MultiPolygon, Polygon } from '@turf/turf';
import { NotFoundError } from '@map-colonies/error-types';
import { degreesPerPixelToZoomLevel, ILogger } from '@map-colonies/mc-utils';
import { JobManagerClient } from '@map-colonies/mc-priority-queue';
import { CatalogClient } from '../../clients/catalogClient';
import { Services } from '../../common/constants';
import { IConfig } from '../../common/interfaces';
import { TileBatcher } from './tileBatcher';

@singleton()
export class TaskManager {
  private readonly batchSize: number;
  private readonly taskType: string;

  public constructor(
    private readonly catalog: CatalogClient,
    private readonly batcher: TileBatcher,
    @inject(Services.CONFIG) config: IConfig,
    private readonly jobsClient: JobManagerClient,
    @inject(Services.LOGGER) private readonly logger: ILogger
  ) {
    this.batchSize = config.get<number>('batchSize');
    this.taskType = config.get<string>('serviceClients.taskType');
  }

  public async createBatchedTasks(resourceId: string, resourceVersion: string, jobId: string, layerRelativePath: string): Promise<void> {
    const logData = `job: ${jobId}, id: ${resourceId}, version: ${resourceVersion}, layerRelativePath: ${layerRelativePath}`;
    this.logger.info(`create batched tiles tasks for ${logData}`);
    const layer =  {
      metadata: {
        footprint: {"type":"Polygon","coordinates":[[[34.8468438649828,32.0689996810298],[34.8637856279928,32.0590059440186],[34.8773961450173,32.0680478960404],[34.8804418550117,32.0528193460686],[34.8786334639958,32.0466327470143],[34.8605495609931,32.0488218510146],[34.8468438649828,32.0689996810298]]]},
        resolution: 0.0000214576721191406
      }
    }// await this.catalog.getDiscreteMetadata(resourceId, resourceVersion);
    const footprint = layer.metadata?.footprint as Polygon | Feature<Polygon> | Feature<MultiPolygon>;
    const maxZoomLevel = degreesPerPixelToZoomLevel(layer.metadata?.resolution as number);
    for (let zoomLevel = 0; zoomLevel <= maxZoomLevel; zoomLevel++) {
      this.logger.debug(`Creating tile batch for zoom level ${zoomLevel}`);
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
        try {
          await this.jobsClient.enqueueTask(jobId, {
            type: this.taskType,
            parameters,
          });
        } catch (err) {
          // if (err instanceof NotFoundError) {
          //   return null;
          // } else {
          //   this.logger.error(`[TaskHandler][dequeue] error=${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
          //   throw err;
          // }
        }

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
