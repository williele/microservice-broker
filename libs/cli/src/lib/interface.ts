import type { ServiceSchema } from '@williele/broker';

export interface LocalServiceSchema {
  dependencies: {
    [name: string]: ServiceSchema;
  };
}
