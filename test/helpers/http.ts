import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { authHeader } from './seed';

export function api(app: INestApplication<App>) {
  return request(app.getHttpServer());
}

export function authedApi(app: INestApplication<App>, token: string) {
  const agent = request(app.getHttpServer());
  const headers = authHeader(token);
  return {
    get: (url: string) => agent.get(url).set(headers),
    post: (url: string) => agent.post(url).set(headers),
    patch: (url: string) => agent.patch(url).set(headers),
    delete: (url: string) => agent.delete(url).set(headers),
  };
}
