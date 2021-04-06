#!/usr/bin/env node

// import { program } from '@caporal/core';
import yargs, { Arguments } from 'yargs';
import { generateCmd } from './generate';
// import { introspectCmd } from './instrospect';

yargs(process.argv.slice(2))
  // Generate command
  .command(
    ['generate', 'g'],
    'Generate service dependencies clients',
    (yargs) => {
      return yargs
        .option('config', {
          alias: 'c',
          description: 'Path to config file',
          default: 'broker.yml',
        })
        .option('service', {
          alias: 's',
          description: 'Service(s) to generate',
          array: true,
        });
    },
    async (argv: Arguments) => {
      await generateCmd(
        {
          configFile: argv['c'] as string,
          services: argv['s'] as string[] | undefined,
        },
        console
      );
    }
  )
  .strictCommands()
  .demandCommand(1).argv;

// program
//   .command('generate', 'Generate service dependencies client')
//   .alias('g')
//   .option('-c, --config <file>', 'Path of config file', {
//     required: true,
//     default: 'broker.yml',
//     validator: program.STRING,
//   })
//   .option('-s, --services <services...>', 'Service(s) to generate', {
//     validator: program.ARRAY | program.STRING,
//   })
//   .action(async ({ options, logger }) => {
//     await generateCmd(
//       {
//         configFile: options['config'].toString(),
//         services: options['services'] as string[],
//       },
//       logger
//     );
//   });

// program
//   .command('introspect', 'Get schema of dependecies')
//   .alias('i')
//   .option('-c, --config <file>', 'Path of config file', {
//     required: true,
//     default: 'broker.yml',
//   })
//   .action(async ({ options, logger }) => {
//     await introspectCmd({ configFile: options['config'].toString() }, logger);
//   });

// program.run();
