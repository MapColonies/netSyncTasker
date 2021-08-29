import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { TaskGeneratorController } from '../controllers/taskGeneratorController';

const taskGeneratorFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(TaskGeneratorController);

  router.post('/generateTasks', controller.generateTasks);

  return router;
};

export { taskGeneratorFactory };
