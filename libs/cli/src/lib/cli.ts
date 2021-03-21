#!/usr/bin/env node

import { program } from '@caporal/core';
import { generateCmd } from './generate';

program
  .command('generate', 'Generate service dependencies client')
  .alias('g')
  .argument('<config>', 'Path to config file', { default: 'broker.yml' })
  .action(async ({ args }) => {
    await generateCmd(args['config'].toString());
  });

program.run();
