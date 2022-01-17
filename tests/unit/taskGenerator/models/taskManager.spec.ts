import jsLogger from '@map-colonies/js-logger';
import * as utils from '@map-colonies/mc-utils';
import { TaskManager } from '../../../../src/taskGenerator/models/taskManager';
import { catalogClientMock, getDiscreteMetadataMock } from '../../../mocks/catalogClient';
import { tileRangerMock, encodeFootprintMock } from '../../../mocks/tileRanger';
import { configMock, clear, init, setValue } from '../../../mocks/config';
import { jobManagerClientMock, findTasksMock, enqueueTaskMock } from '../../../mocks/JobManagerClient';

describe('taskManager', () => {
  let manager: TaskManager;

  beforeEach(() => {
    init();
    setValue('batchSize', 3);
    setValue('serviceClients.taskType', 'test');
    const logger = jsLogger({ enabled: false });

    manager = new TaskManager(catalogClientMock, tileRangerMock, configMock, jobManagerClientMock, logger);
  });

  afterEach(() => {
    clear();
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  //test data
  const testFootprint = {
    type: 'Polygon',
    coordinates: [
      [
        [-1, 0],
        [0, 1],
        [1, 0],
        [-1, 0],
      ],
    ],
  };
  const testDiscreteLayer = {
    metadata: {
      resolution: 0.00274658203125, //zoom 8
      footprint: testFootprint,
    },
  };
  const testTileRanges = [{ minX: 0, minY: 2, maxX: 5, maxY: 4, zoom: 8 }];

  describe('createBatchedTasks', () => {
    it('t', async () => {
      findTasksMock.mockResolvedValue(undefined);
      getDiscreteMetadataMock.mockResolvedValue(testDiscreteLayer);
      enqueueTaskMock.mockResolvedValue(undefined);
      encodeFootprintMock.mockImplementation(() => {
        return testTileRanges.map((range) => ({ ...range }));
      });

      await manager.createBatchedTasks('testId', 'testVersion', 'testJob', 'testPath', 'testTarget');

      expect(getDiscreteMetadataMock).toHaveBeenCalledTimes(1);
      expect(getDiscreteMetadataMock).toHaveBeenCalledWith('testId', 'testVersion');
      expect(encodeFootprintMock).toHaveBeenCalledTimes(9);
      for (let i = 8; i--; i >= 0) {
        expect(encodeFootprintMock).toHaveBeenCalledWith(testFootprint, i);
      }
      expect(findTasksMock).toHaveBeenCalledTimes(36);
      expect(enqueueTaskMock).toHaveBeenCalledTimes(36);
    });
  });
});
