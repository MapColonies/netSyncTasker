import { Logger } from '@map-colonies/js-logger';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { Services } from '../../common/constants';
import { TaskManager } from '../models/taskManager';

interface IGenerateTasksRequest {
  jobId: string;
  resourceId: string;
  resourceVersion: string;
}

type GenerateTasksHandler = RequestHandler<undefined, undefined, IGenerateTasksRequest>;

@injectable()
export class TaskGeneratorController {
  public constructor(@inject(Services.LOGGER) private readonly logger: Logger, private readonly manager: TaskManager) {}

  public generateTasks: GenerateTasksHandler = async (req, res, next) => {
    try {
      await this.manager.createBatchedTasks(req.body.resourceId, req.body.resourceVersion, req.body.jobId);
      return res.sendStatus(httpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  };
}
