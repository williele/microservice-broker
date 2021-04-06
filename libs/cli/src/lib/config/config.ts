import { Broker, SerializerConfig, TransporterConfig } from '@williele/broker';
import { readFileSync } from 'fs';
import { dirname, extname, resolve } from 'path';
import { parse } from 'yaml';
// import { Logger } from '@caporal/core';
import { Service, Source } from './interface';
import { validate } from './validate';

export class Configure {
  readonly sources: Record<string, Source> = {};
  readonly services: Record<string, Service> = {};

  readonly configDir: string;

  constructor(configFile: string, public readonly logger?: any) {
    // Load file
    const context = readFileSync(configFile, 'utf8');
    let config;
    switch (extname(configFile)) {
      case '.yaml':
      case '.yml':
        config = parse(context);
        break;

      case '.json':
        config = JSON.parse(context);
        break;

      default:
        throw new TypeError(`Unknown config file extension`);
    }

    // config dir
    this.configDir = dirname(configFile);

    const valid = validate(config);
    if (!valid)
      throw new TypeError(
        `Config is not valid: ${validate.errors
          .map((e) => e.message)
          .join('|')}`
      );

    this.getSources(config);
    this.getExternal(config);
    this.getLocal(config);
  }

  private getSources(config) {
    // Config source
    Object.entries(config.sources || {}).forEach(([name, config]) => {
      const { serializer, transporter } = config as {
        serializer: SerializerConfig['name'];
        transporter: TransporterConfig;
      };
      this.sources[name] = { name, serializer, transporter };
    });
  }

  private getExternal(config) {
    // Config external services
    Object.entries(config.externals || {}).forEach(([name, config]) => {
      const cfg = config as {
        serviceName?: string;
        source?: string;
      };

      const source = cfg.source || 'default';
      if (!this.sources[source])
        throw new TypeError(
          `External '${name}' source '${cfg.source}' is not define`
        );

      this.services[name] = {
        type: 'external',
        serviceName: cfg.serviceName || name,
        source: this.sources[source],
      };
    });
  }

  private getLocal(config) {
    // Config local services
    Object.entries(config.services || {}).forEach(([name, config]) => {
      const cfg = config as {
        serviceName?: string;
        source?: string;
        schema: string;
        generate?: { output: string };
        dependencies?: Record<string, { alias: string }>;
      };

      const source = cfg.source || 'default';
      if (!this.sources[source])
        throw new TypeError(
          `Service '${name}' source '${cfg.source}' is not define`
        );
      if (this.services[name])
        throw new TypeError(`Service '${name}' is duplicated`);

      this.services[name] = {
        type: 'local',
        serviceName: cfg.serviceName || name,
        schema: cfg.schema,
        generate: cfg.generate,
        source: this.sources[source],
        dependencies: cfg.dependencies
          ? Object.entries(cfg.dependencies).reduce(
              (a, [name, config]) => ({ ...a, [config.alias || name]: name }),
              {}
            )
          : {},
      };
    });
  }

  async createBorker(serviceName: string, source: Source) {
    const broker = new Broker({
      serviceName,
      serializer: { name: source.serializer },
      transporter: source.transporter,
      disableServer: true,
    });

    await broker.start();
    return broker;
  }

  resolve(path: string) {
    return resolve(this.configDir, path);
  }
}
