import { container } from 'tsyringe';
import { trace } from '@opentelemetry/api';
import { Metrics } from '@map-colonies/telemetry';
import jsLogger from '@map-colonies/js-logger';
import { JobManagerClient } from '@map-colonies/mc-priority-queue';
import { TileRanger } from '@map-colonies/mc-utils';
import { Services } from '../../src/common/constants';
import { configMock } from '../mocks/config';
import { jobManagerClientMock } from '../mocks/JobManagerClient';
import { CatalogClient } from '../../src/clients/catalogClient';
import { catalogClientMock } from '../mocks/catalogClient';
import { tileRangerMock } from '../mocks/tileRanger';

function registerTestValues(): void {
  container.register(Services.CONFIG, { useValue: configMock });
  container.register(Services.LOGGER, { useValue: jsLogger({ enabled: false }) });

  // if sdk is not initialized then getTracer returns a NoopTracer
  const testTracer = trace.getTracer('testTracer');
  container.register(Services.TRACER, { useValue: testTracer });

  const metrics = new Metrics('app_meter');
  const meter = metrics.start();
  container.register(Services.METER, { useValue: meter });

  container.register(JobManagerClient, { useValue: jobManagerClientMock });
  container.register(CatalogClient, { useValue: catalogClientMock });
  container.register(TileRanger, { useValue: tileRangerMock });
}

export { registerTestValues };
