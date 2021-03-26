import { Logger } from '@caporal/core';
import { Broker } from '@williele/broker';
import { mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { Configure } from '../config';
import { LocalService, Source } from '../config/interface';
import { LocalServiceSchema } from '../interface';

export async function introspectCmd(
  options: {
    configFile: string;
  },
  logger?: Logger
) {
  try {
    const config = Configure.fromFile(options.configFile);
    await introspect(config, options.configFile, logger);
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }
}

export async function introspect(
  config: Configure,
  configFile: string,
  logger?: Logger
) {
  // Get config introspect
  for (const service of Object.values(config.services)) {
    if (service.type !== 'local') continue;
    const schema = await createServiceSchema(config, service, logger);

    writeServiceSchema(service, schema, path.dirname(configFile), logger);
  }
}

export async function createServiceSchema(
  configure: Configure,
  service: LocalService,
  logger?: Logger
) {
  if (service.type !== 'local') return;
  // Inspecting service
  logger?.info(`Inspecting ${service.serviceName}`);

  const brokers: Record<string, Broker> = {};
  async function getBroker(source: Source) {
    if (!brokers[source.name]) {
      logger?.info(`Connect broker '${source.name}'`);
      const broker = await configure
        .createBorker(service.serviceName, source)
        .catch(async (err) => {
          await destroyAll();
          throw err;
        });
      brokers[source.name] = broker;
      return broker;
    } else {
      return brokers[source.name];
    }
  }

  async function destroyAll() {
    await Promise.all(Object.values(brokers).map((b) => b.destroy()));
  }

  const schema: LocalServiceSchema = {
    generate: service.generate,
    dependencies: {},
  };

  // Extract dependecies
  for (const [name, dependency] of Object.entries(service.dependencies)) {
    // Name is alias name
    // Dependency is keyword of services Records
    if (schema.dependencies[name])
      throw new TypeError(`Dependency alias '${name}' is duplicated`);
    const target = configure.services[dependency];
    if (!target) throw new TypeError(`Dependency '${dependency}' is not found`);

    // Fetch schema
    const broker: Broker = await getBroker(target.source);
    const client = broker.createClient(target.serviceName);

    const targetSchema = await client.fetchSchema().catch(async (err) => {
      await destroyAll();
      throw err;
    });

    schema.dependencies[name] = {
      serviceName: target.serviceName,
      serializer: targetSchema.serializer,
      transporter: targetSchema.transporter,
      types: Object.entries(targetSchema.types).reduce(
        (a, [name, config]) => ({ ...a, [name]: JSON.parse(config) }),
        {}
      ),
      methods: targetSchema.methods,
    };
  }

  // Clean up broker
  await destroyAll();
  return schema;
}

export function writeServiceSchema(
  service: LocalService,
  schema: LocalServiceSchema,
  configFileDir: string,
  logger?: Logger
) {
  const generatedDir = path.dirname(service.schema);
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(
    path.resolve(configFileDir, service.schema),
    JSON.stringify(schema, null, 2)
  );

  logger?.info(
    `Write service schem '${service.serviceName}' to ${service.schema}`
  );
}
