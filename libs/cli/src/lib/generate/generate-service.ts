import { Broker } from '@williele/broker';
import { DependencyConfig, ServiceConfig } from '../interface';
import { getDependencies } from '../utils/config-reader';
import { generateClient } from './generate-client';
import { writeFile } from 'fs';
import { promisify } from 'util';
import { resolve } from 'path';

const writeFileAsync = promisify(writeFile);

export async function generateService(config: ServiceConfig) {
  await Promise.all(
    getDependencies(config).map((d) => generateDependency(config, d))
  );
}

export async function generateDependency(
  serviceConfig: ServiceConfig,
  config: DependencyConfig
) {
  const broker = new Broker({
    serviceName: serviceConfig.name,
    serializer: config.serializer,
    transporter: config.transporter,
    disableServer: true,
  });
  await broker.start();

  const client = broker.createClient(config.name);
  const schema = await client.fetchSchema();

  const clientFile = generateClient(
    config.name,
    schema,
    serviceConfig.generate
  );
  const path = resolve(serviceConfig.generate.dir, `${config.name}.client.ts`);
  console.log(clientFile);
  console.log(path);

  await writeFileAsync(path, clientFile);

  await broker.destroy();
}
