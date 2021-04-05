import { AddCommandConfig, AddMethodConfig } from '@williele/broker';

export type MethodConfig = Omit<
  AddMethodConfig,
  'type' | 'name' | 'handler'
> & { name?: string };

export type CommandConfig = Omit<
  AddCommandConfig,
  'type' | 'name' | 'handler'
> & { name?: string };
