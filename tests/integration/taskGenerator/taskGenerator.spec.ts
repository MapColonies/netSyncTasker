import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { getDiscreteMetadataMock } from '../../mocks/catalogClient';
import { setValue as SetConfigValue, clear as clearConfig } from '../../mocks/config';
import { enqueueTaskMock, findTasksMock } from '../../mocks/JobManagerClient';
import { encodeFootprintMock } from '../../mocks/tileRanger';

import { registerTestValues } from '../testContainerConfig';
import * as requestSender from './helpers/requestSender';

describe('TaskGenerator', function () {
  beforeEach(function () {
    SetConfigValue('batchSize', 3);
    registerTestValues();
    requestSender.init();
  });

  afterEach(function () {
    clearConfig();
    container.clearInstances();
    jest.resetAllMocks();
  });

  //test data
  const testResourceId = 'test-layer';
  const testResourceVersion = 'test-version';
  const testJobId = '7bf72e2a-6e6d-4a2f-a6e2-e764268d1f0c';
  const testLayerRelativePath = `${testResourceId}-${testResourceVersion}-testProductType`;
  const testTarget = `testTarget`;
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
  const testTileRanges = [
    { minX: 0, minY: 2, maxX: 5, maxY: 4, zoom: 8 },
    { minX: 0, minY: 6, maxX: 2, maxY: 8, zoom: 8 },
    { minX: 0, minY: 8, maxX: 1, maxY: 11, zoom: 8 },
  ];
  const taskTypeName = 'taskTypeName';

  describe('Happy Path', function () {
    it('should return 200 status code and generate task for every batch', async function () {
      //mocks
      getDiscreteMetadataMock.mockResolvedValue(testDiscreteLayer);
      encodeFootprintMock.mockReturnValue(testTileRanges);

      //action
      const reqBody = {
        jobId: testJobId,
        resourceId: testResourceId,
        resourceVersion: testResourceVersion,
        layerRelativePath: testLayerRelativePath,
        target: testTarget,
      };
      const response = await requestSender.generateTasks(reqBody);

      //assertions
      expect(response.status).toBe(httpStatusCodes.CREATED);
      expect(getDiscreteMetadataMock).toHaveBeenCalledTimes(1);
      expect(getDiscreteMetadataMock).toHaveBeenCalledWith(testResourceId, testResourceVersion);
      expect(encodeFootprintMock).toHaveBeenCalledTimes(9);
      expect(encodeFootprintMock).toHaveBeenLastCalledWith(testFootprint, 8);
      expect(enqueueTaskMock).toHaveBeenCalledTimes(6);
      expect(enqueueTaskMock.mock.calls).toEqual([
        [
          testJobId,
          {
            type: taskTypeName,
            parameters: {
              batch: [{ minX: 0, maxX: 3, minY: 2, maxY: 3, zoom: 8 }],
              resourceId: testResourceId,
              resourceVersion: testResourceVersion,
              layerRelativePath: testLayerRelativePath,
              target: testTarget,
            },
          },
        ],
        [
          testJobId,
          {
            type: taskTypeName,
            parameters: {
              batch: [
                { minX: 3, maxX: 5, minY: 2, maxY: 3, zoom: 8 },
                { minX: 0, maxX: 1, minY: 3, maxY: 4, zoom: 8 },
              ],
              resourceId: testResourceId,
              resourceVersion: testResourceVersion,
              layerRelativePath: testLayerRelativePath,
              target: testTarget,
            },
          },
        ],
        [
          testJobId,
          {
            type: taskTypeName,
            parameters: {
              batch: [{ minX: 1, maxX: 4, minY: 3, maxY: 4, zoom: 8 }],
              resourceId: testResourceId,
              resourceVersion: testResourceVersion,
              layerRelativePath: testLayerRelativePath,
              target: testTarget,
            },
          },
        ],
        [
          testJobId,
          {
            type: taskTypeName,
            parameters: {
              batch: [
                { minX: 4, maxX: 5, minY: 3, maxY: 4, zoom: 8 },
                { minX: 0, maxX: 2, minY: 6, maxY: 7, zoom: 8 },
              ],
              resourceId: testResourceId,
              resourceVersion: testResourceVersion,
              layerRelativePath: testLayerRelativePath,
              target: testTarget,
            },
          },
        ],
        [
          testJobId,
          {
            type: taskTypeName,
            parameters: {
              batch: [
                { minX: 0, maxX: 2, minY: 7, maxY: 8, zoom: 8 },
                { minX: 0, maxX: 1, minY: 8, maxY: 9, zoom: 8 },
              ],
              resourceId: testResourceId,
              resourceVersion: testResourceVersion,
              layerRelativePath: testLayerRelativePath,
              target: testTarget,
            },
          },
        ],
        [
          testJobId,
          {
            type: taskTypeName,
            parameters: {
              batch: [{ minX: 0, maxX: 1, minY: 9, maxY: 11, zoom: 8 }],
              resourceId: testResourceId,
              resourceVersion: testResourceVersion,
              layerRelativePath: testLayerRelativePath,
              target: testTarget,
            },
          },
        ],
      ]);
    });

    it('should return 200 and skip duplicate batches', async () => {
      const testTileRanges2 = [{ minX: 0, minY: 0, maxX: 4, maxY: 1, zoom: 8 }];

      //mocks
      getDiscreteMetadataMock.mockResolvedValue(testDiscreteLayer);
      encodeFootprintMock.mockReturnValue(testTileRanges2);
      findTasksMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce([{}]);
      //action
      const reqBody = {
        jobId: testJobId,
        resourceId: testResourceId,
        resourceVersion: testResourceVersion,
        layerRelativePath: testLayerRelativePath,
        target: testTarget,
      };
      const response = await requestSender.generateTasks(reqBody);

      //assertions
      expect(response.status).toBe(httpStatusCodes.CREATED);
      expect(getDiscreteMetadataMock).toHaveBeenCalledTimes(1);
      expect(getDiscreteMetadataMock).toHaveBeenCalledWith(testResourceId, testResourceVersion);
      expect(encodeFootprintMock).toHaveBeenCalledTimes(9);
      expect(encodeFootprintMock).toHaveBeenLastCalledWith(testFootprint, 8);
      expect(enqueueTaskMock).toHaveBeenCalledTimes(1);
      expect(enqueueTaskMock).toHaveBeenCalledWith(testJobId, {
        type: taskTypeName,
        parameters: {
          batch: [{ minX: 0, maxX: 3, minY: 0, maxY: 1, zoom: 8 }],
          resourceId: testResourceId,
          resourceVersion: testResourceVersion,
          layerRelativePath: reqBody.layerRelativePath,
          target: reqBody.target,
        },
      });
    });
  });

  describe('Bad Path', function () {
    // All requests with status code of 400
    it('returns 400 with no body', async () => {
      const response = await requestSender.generateTasks(undefined);

      //assertions
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    });

    it('returns 400 on invalid body', async () => {
      const reqBody = {
        jobId: 'not uuid',
        resourceId: 'string',
        resourceVersion: 'string',
        layerRelativePath: 'string',
        target: 'string',
      };

      const response = await requestSender.generateTasks(reqBody);

      //assertions
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    });
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
  });
});
