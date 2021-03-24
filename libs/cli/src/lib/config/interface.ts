import type { TransporterConfig, SerializerConfig } from '@williele/broker';

export interface Source {
  name: string;
  serializer: SerializerConfig['name'];
  transporter: TransporterConfig;
}

export type Service = ExternalService | LocalService;

interface BaseService {
  serviceName: string;
  source: Source;
}

export interface ExternalService extends BaseService {
  type: 'external';
}

export interface LocalService extends BaseService {
  type: 'local';
  schema: string;
  generate?: {
    output: string;
  };
  dependencies: Record<string, string>;
}
