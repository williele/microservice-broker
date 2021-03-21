import { Broker } from '@williele/broker';
import { DependencyConfig, ServiceConfig } from '../interface';
import { getDependencies } from '../utils/config-reader';

export async function generateService(config: ServiceConfig) {
  console.log(config);

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

  console.log(schema);

  await broker.destroy();
  console.log('ended');
}
