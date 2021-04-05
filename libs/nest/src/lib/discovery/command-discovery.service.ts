import { Injectable } from '@nestjs/common';
import { MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { AddCommandConfig } from '@williele/broker';
import { COMMAND_TOKEN } from '../constant';
import { CommandConfig } from '../interface';
import { filterEmpty } from '../utils/array.utils';
import { MiddlewareDiscovery } from './middleware-discovery.service';

@Injectable()
export class CommandDiscovery {
  constructor(
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly middlewareDicovery: MiddlewareDiscovery
  ) {}

  async scan(provider: InstanceWrapper): Promise<AddCommandConfig[]> {
    const { instance } = provider;
    const prototype = Object.getPrototypeOf(instance);

    const commandConfigs = this.scanner
      .scanFromPrototype(instance, prototype, (name) => ({
        name,
        handler: prototype[name],
        provider,
      }))
      .filter(filterEmpty);

    const commands = [];
    for (const { name, handler, provider } of commandConfigs) {
      const command = await this.config(name, handler, provider);
      if (command) commands.push(command);
    }

    return commands;
  }

  private async config(
    name: string,
    handle: CallableFunction,
    provider: InstanceWrapper
  ): Promise<AddCommandConfig> {
    const command: CommandConfig = this.reflector.get(COMMAND_TOKEN, handle);
    if (!command) return;

    // Bind command instance
    const commandHandler = handle.bind(provider.instance);

    return {
      ...command,
      type: 'command',
      name: command.name || name,
      middlewares: await this.middlewareDicovery.scan(handle, provider),
      handler: async (ctx) => {
        await commandHandler(ctx);
      },
    };
  }
}
