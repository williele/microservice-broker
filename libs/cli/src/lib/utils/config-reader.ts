import { readFile } from 'fs';
import { promisify } from 'util';
import { parse } from 'yaml';
import { BrokerCLIConfig, DependencyConfig, ServiceConfig } from '../interface';

const pReadFile = promisify(readFile);

export async function configReader(
  configFile: string
): Promise<BrokerCLIConfig> {
  const configContext = await pReadFile(configFile, 'utf8');
  const config = parse(configContext);

  /**
   * @todo verify config file
   */

  return config;
}

export function getServices(cliConfig: BrokerCLIConfig): ServiceConfig[] {
  return Object.entries(cliConfig.services).reduce((a, [name, config]) => {
    const service: ServiceConfig = {
      name,
      serializer: cliConfig.serializer,
      transporter: cliConfig.transporter,
      ...config,
    };

    if (!service.serializer)
      throw new TypeError(`Missing serializer config for service '${service}'`);
    if (!service.transporter)
      throw new TypeError(`Missing transport config for service '${service}'`);

    return [...a, service];
  }, []);
}

export function getDependencies(
  serviceConfig: ServiceConfig
): DependencyConfig[] {
  return Object.entries(serviceConfig.generate.dependencies).reduce(
    (a, [name, config]) => {
      const dependency: DependencyConfig = {
        name,
        serializer: serviceConfig.serializer,
        transporter: serviceConfig.transporter,
        ...config,
      };

      if (!dependency.serializer)
        throw new TypeError(
          `Missing serializer config for dependency '${name}' on service '${serviceConfig.name}'`
        );
      if (!dependency.transporter)
        throw new TypeError(
          `Missing transporter config for dependency '${name}' on service '${serviceConfig.name}'`
        );

      return [...a, dependency];
    },
    []
  );
}
