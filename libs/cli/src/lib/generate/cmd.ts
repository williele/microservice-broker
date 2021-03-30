import { Logger } from '@caporal/core';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { ServiceSchema } from '@williele/broker';
// import { ServiceSchema } from 'libs/broker/src/lib/core';
import { dirname, join } from 'path';
import { Configure } from '../config';
// import { LocalServiceSchema } from '../interface';
import { clientClassName, generateDependency } from './generate-dep';
import { FileGenerator, RawNode } from './generators';

export async function generateCmd(
  options: {
    configFile: string;
    services?: string[];
  },
  logger?: Logger
) {
  try {
    const config = new Configure(options.configFile, logger);
    generate(config, options.services);
  } catch (err) {
    logger?.error(err.message);
    process.exit(1);
  }
}

async function generate(config: Configure, services?: string[]) {
  // Services to generate
  // If services not given generate for all services
  const serviceNames = services
    ? services
    : Object.entries(config.services)
        .filter(([, s]) => s.type === 'local')
        .map(([name]) => name);

  serviceNames
    .map((name) => generateService(config, name, !!services))
    .reduce((a, b) => [...a, ...b], [])
    .forEach(({ text, fileName }) => {
      const path = config.resolve(fileName);
      const dir = dirname(path);

      mkdirSync(dir, { recursive: true });
      config.logger?.info(`Write: ${path}`);
      writeFileSync(path, text);
    });
}

export function generateService(
  config: Configure,
  name: string,
  strict = true
) {
  const service = config.services[name];
  if (!service) {
    throw new TypeError(`Service '${name}' not found in config file`);
  }
  if (service.type !== 'local') {
    throw new TypeError(`Service '${name}' is not local service`);
  }
  if (!service.generate) {
    if (strict)
      throw new TypeError(`Service '${name}' don't have generate options`);
    else return [];
  }

  // Get dependencies
  const dependecies = Object.entries(service.dependencies || {});
  if (!dependecies.length) return;

  const files: { file: FileGenerator; fileName: string }[] = [];

  const dIndex = new FileGenerator();
  const sIndex = new FileGenerator();
  files.push({ file: dIndex, fileName: 'index.d.ts' });
  files.push({ file: sIndex, fileName: 'index.js' });

  // Generate dependencies
  for (const dependency of dependecies) {
    const [name, serviceName] = dependency;

    const dependencyService = config.services[serviceName];
    if (!dependencyService) {
      throw new TypeError(`Unknown dependencies '${serviceName}'`);
    }
    if (dependencyService.type === 'external') {
      throw new TypeError(`External dependencies is not support yet.`);
    }
    if (!dependencyService.schema) {
      throw new TypeError(`Dependencies '${serviceName}' schema not found`);
    }

    // Get dependencies schema
    const schema: ServiceSchema = JSON.parse(
      readFileSync(config.resolve(dependencyService.schema), 'utf8')
    );
    const { declareFile, scriptFile } = generateDependency(name, schema);

    const clientName = clientClassName(name);

    files.push({ file: declareFile, fileName: `${name}.d.ts` });
    files.push({ file: scriptFile, fileName: `${name}.js` });

    dIndex.addNodes(new RawNode(`export { ${clientName} } from './${name}';`));
    sIndex.addNodes(
      new RawNode(`exports.${clientName} = require('./${name}').${clientName};`)
    );
  }

  const outDir = service.generate.output;
  return files.map((f) => ({
    fileName: join(outDir, f.fileName),
    text: f.file.toText(),
  }));
}
