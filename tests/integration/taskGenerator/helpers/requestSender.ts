import * as supertest from 'supertest';
import { Application } from 'express';

import { container } from 'tsyringe';
import { ServerBuilder } from '../../../../src/serverBuilder';

let app: Application | null = null;

export function init(): void {
  const builder = container.resolve<ServerBuilder>(ServerBuilder);
  app = builder.build();
}

export async function generateTasks(body: Record<string, unknown> | undefined): Promise<supertest.Response> {
  return supertest.agent(app).post('/generateTasks').set('Content-Type', 'application/json').send(body);
}
