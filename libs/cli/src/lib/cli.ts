#!/usr/bin/env node

import { program } from '@caporal/core';
import { generateCmd } from './generate';
import { introspectCmd } from './instrospect';

program
  .command('generate', 'Generate service dependencies client')
  .alias('g')
  .argument('<config>', 'Path to config file', { default: 'broker.yml' })
  .action(async ({ args }) => {
    await generateCmd(args['config'].toString());
  });

program
  .command('introspect', 'Get schema of dependecies')
  .option('-c, --config <file>', 'Path of config file', {
    required: true,
    default: 'broker.yml',
  })
  .action(async ({ options, logger }) => {
    await introspectCmd({ configFile: options['config'] as string }, logger);
  });

program.run();
