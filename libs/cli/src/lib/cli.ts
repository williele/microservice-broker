#!/usr/bin/env node

import { program } from '@caporal/core';
import { generateCmd } from './generate';
import { introspectCmd } from './instrospect';

program
  .command('generate', 'Generate service dependencies client')
  .alias('g')
  .option('-c, --config <file>', 'Path of config file', {
    required: true,
    default: 'broker.yml',
    validator: program.STRING,
  })
  .option('-s, --services <services...>', 'Service(s) to generate', {
    validator: program.ARRAY | program.STRING,
  })
  .action(async ({ options, logger }) => {
    await generateCmd(
      {
        configFile: options['config'].toString(),
        services: options['services'] as string[],
      },
      logger
    );
  });

program
  .command('introspect', 'Get schema of dependecies')
  .alias('i')
  .option('-c, --config <file>', 'Path of config file', {
    required: true,
    default: 'broker.yml',
  })
  .action(async ({ options, logger }) => {
    await introspectCmd({ configFile: options['config'].toString() }, logger);
  });

program.run();
