import { packageLoader } from '../utils/package-loader';
import type { Queue, Job } from 'bull';
import { Broker } from '../broker';
import { BrokerConfig, ID } from '../interface';
import { Outbox } from './outbox';

let bull: typeof import('bull');

export class OutboxProcessor {
  private readonly command: Queue;
  private readonly schedule: Queue;
  private readonly outbox: Outbox;

  constructor(
    private readonly broker: Broker,
    private readonly config: BrokerConfig
  ) {
    bull = packageLoader('bull', 'Job', () => require('bull'));

    this.outbox = config.outbox.outbox;

    this.command = new bull(`${broker.serviceName}_command_sender`, {
      redis: config.outbox.redis,
      prefix: `${broker.serviceName}_service`,
    });
    this.schedule = new bull(`${broker.serviceName}_command_schedule`, {
      redis: config.outbox.redis,
      prefix: `${broker.serviceName}_service`,
    });
  }

  async start() {
    console.log('processor start');

    this.command.process(this.processor.bind(this));

    this.schedule.process(this.scheduleProcessor.bind(this));
    const schedule = await this.schedule.getJob('schedule');
    console.log(schedule);
    if (!schedule) {
      this.schedule.add(null, {
        jobId: 'schedule',
        repeat: { cron: '*/15 * * * * *' },
      });
    }
  }

  async add(message: ID | ID[]) {
    if (Array.isArray(message)) {
      await this.command.addBulk(
        message.map((m) => ({
          data: null,
          opts: {
            jobId: m,
            attempts: 5,
            backoff: 5,
          },
        }))
      );
    } else {
      await this.command.add(null, {
        jobId: message,
        attempts: 5,
        backoff: 5,
      });
    }
  }

  private async scheduleProcessor(_job: Job, done: CallableFunction) {
    this.config.logger?.log('Output processor schedule check outbox');
    const message = await this.outbox.list();
    this.add(message);

    done();
  }

  private async processor(job: Job, done: CallableFunction) {
    const message = await this.outbox.get(job.id);
    if (!message) {
      return done();
    }

    console.log(message);

    // await this.broker.command(message);

    done();
  }
}
