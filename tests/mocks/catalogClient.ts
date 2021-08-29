import { CatalogClient } from '../../src/clients/catalogClient';

const getDiscreteMetadataMock = jest.fn();
const catalogClientMock = {
  getDiscreteMetadata: getDiscreteMetadataMock,
} as unknown as CatalogClient;

export { getDiscreteMetadataMock, catalogClientMock };
