import { TileRanger } from '@map-colonies/mc-utils';

const encodeFootprintMock = jest.fn();
const tileRangerMock = {
  encodeFootprint: encodeFootprintMock,
} as unknown as TileRanger;

export { tileRangerMock, encodeFootprintMock };
