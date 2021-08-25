import { JobManagerClient } from '@map-colonies/mc-priority-queue';

const getTaskMock = jest.fn();
const getTasksForJobMock = jest.fn();
const getJobMock = jest.fn();
const consumeMock = jest.fn();
const enqueueTaskMock = jest.fn();
const updateTaskMock = jest.fn();
const createJobMock = jest.fn();
const updateJobMock = jest.fn();

const jobManagerClientMock = {
  getTask: getTaskMock,
  getTasksForJob: getTasksForJobMock,
  getJob: getJobMock,
  consume: consumeMock,
  enqueueTask: enqueueTaskMock,
  updateTask: updateTaskMock,
  createJob: createJobMock,
  updateJob: updateJobMock,
} as unknown as JobManagerClient;

export {
  jobManagerClientMock,
  getTaskMock,
  getTasksForJobMock,
  getJobMock,
  consumeMock,
  enqueueTaskMock,
  updateJobMock,
  createJobMock,
  updateTaskMock,
};
