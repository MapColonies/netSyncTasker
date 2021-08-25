import { IRasterCatalogUpsertRequestBody } from '@map-colonies/mc-model-types';

export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface OpenApiConfig {
  filePath: string;
  basePath: string;
  jsonPath: string;
  uiPath: string;
}

export interface IDiscreteRecord extends Partial<IRasterCatalogUpsertRequestBody> {
  id: string;
}
