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
    const config = new Configure(options.configFile, logger);
    await introspect(config);
  } catch (err) {
    logger?.error(err.message);
    process.exit(1);
  }
}

export async function introspect(config: Configure) {
  // Get config introspect
  for (const service of Object.values(config.services)) {
    if (service.type !== 'local') continue;
    const schema = await createServiceSchema(config, service);

    writeServiceSchema(config, service, schema);
  }
}

async function createServiceSchema(config: Configure, service: LocalService) {
  if (service.type !== 'local') return;
  // Inspecting service
  config.logger?.info(`Inspecting ${service.serviceName}`);

  const brokers: Record<string, Broker> = {};
  async function getBroker(source: Source) {
    if (!brokers[source.name]) {
      config.logger?.info(`Connect broker '${source.name}'`);
      const broker = await config
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
    dependencies: {},
  };

  // Extract dependecies
  for (const [name, dependency] of Object.entries(service.dependencies)) {
    // Name is alias name
    // Dependency is keyword of services Records
    if (schema.dependencies[name])
      throw new TypeError(`Dependency alias '${name}' is duplicated`);
    const target = config.services[dependency];
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

function writeServiceSchema(
  config: Configure,
  service: LocalService,
  schema: LocalServiceSchema
) {
  const generatedDir = path.dirname(service.schema);
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(
    config.resolve(service.schema),
    JSON.stringify(schema, null, 2)
  );

  config.logger?.info(
    `Write service schem '${service.serviceName}' to ${service.schema}`
  );
}
