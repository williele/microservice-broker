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
  .option('config', 'Config file', { required: true, default: 'broker.yml' })
  .action(async ({ options, logger }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await introspectCmd(options['config'] as any, logger);
  });

program.run();
