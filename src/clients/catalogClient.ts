import { inject, singleton } from 'tsyringe';
import { HttpClient, ILogger } from '@map-colonies/mc-utils';
import { NotFoundError } from '@map-colonies/error-types';
import { Services } from '../common/constants';
import { IConfig, IDiscreteRecord } from '../common/interfaces';

@singleton()
export class CatalogClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    super(logger, config.get('serviceClients.catalogUrl'), 'catalog', config.get('httpRetry'));
  }

  public async getDiscreteMetadata(id: string, version: string): Promise<IDiscreteRecord> {
    const url = '/records/find';
    const body = {
      metadata: {
        productId: id,
        productVersion: version,
      },
    };
    const records = await this.post<IDiscreteRecord[]>(url, body);
    if (records.length > 0) {
      return records[0];
    } else {
      throw new NotFoundError(`discrete layer ${id}-${version} not available in catalog`);
    }
  }
}
