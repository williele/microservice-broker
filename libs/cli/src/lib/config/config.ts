import type { SerializerConfig, TransporterConfig } from '@williele/broker';
import { Service, Source } from './interface';
import { validate } from './validate';

export class Configure {
  readonly sources: Record<string, Source> = {};
  readonly services: Record<string, Service> = {};

  constructor(config) {
    const valid = validate(config);
    if (!valid)
      throw new TypeError(
        `Config is not valid: ${validate.errors
          .map((e) => e.message)
          .join('|')}`
      );

    // Config source
    Object.entries(config.sources || {}).forEach(([name, config]) => {
      const { serializer, transporter } = config as {
        serializer: SerializerConfig['name'];
        transporter: TransporterConfig;
      };
      this.sources[name] = { name, serializer, transporter };
    });

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

    // Config local services
    Object.entries(config.services || {}).forEach(([name, config]) => {
      const cfg = config as {
        serviceName?: string;
        source?: string;
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
        source: this.sources[source],
        dependencies: cfg.dependencies
          ? Object.entries(cfg.dependencies).reduce(
              (a, [name, config]) => ({ ...a, [name]: config.alias }),
              {}
            )
          : {},
      };
    });
  }
}
