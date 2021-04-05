import { AddMethodConfig } from '@williele/broker';

export type MethodConfig = Omit<
  AddMethodConfig,
  'type' | 'name' | 'handler'
> & { name?: string };
