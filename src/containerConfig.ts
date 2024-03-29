import { container, instanceCachingFactory } from 'tsyringe';
import config from 'config';
import { logMethod } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { JobManagerClient } from '@map-colonies/mc-priority-queue';
import { Metrics } from '@map-colonies/telemetry';
import { ILogger } from '@map-colonies/mc-utils';
import { Services } from './common/constants';
import { tracing } from './common/tracing';
import { IConfig } from './common/interfaces';

function registerExternalValues(): void {
  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
  // @ts-expect-error the signature is wrong
  const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, hooks: { logMethod } });
  container.register(Services.CONFIG, { useValue: config });
  container.register(Services.LOGGER, { useValue: logger });

  tracing.start();
  const tracer = trace.getTracer('app');
  container.register(Services.TRACER, { useValue: tracer });

  const metrics = new Metrics('app_meter');
  const meter = metrics.start();
  container.register(Services.METER, { useValue: meter });
  container.register('onSignal', {
    useValue: async (): Promise<void> => {
      await Promise.all([tracing.stop(), metrics.stop()]);
    },
  });

  container.register(JobManagerClient, {
    useFactory: instanceCachingFactory<JobManagerClient>((c) => {
      const logger = c.resolve<ILogger>(Services.LOGGER);
      const config = c.resolve<IConfig>(Services.CONFIG);
      return new JobManagerClient(logger, '', config.get('serviceClients.taskType'), config.get('serviceClients.jobManagerUrl'));
    }),
  });
}

export { registerExternalValues };
