import { packageLoader } from '../utils/package-loader';
import type { Queue, Job } from 'bull';
import { Broker } from '../broker';
import { BrokerConfig } from '../interface';
import { Outbox } from './outbox';
import { MessagePackage } from './interface';

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
      prefix: `{${broker.serviceName}_service}`,
    });
    this.schedule = new bull(`${broker.serviceName}_command_schedule`, {
      redis: config.outbox.redis,
      prefix: `{${broker.serviceName}_service}`,
    });
  }

  async start() {
    console.log('processor start');

    this.command.process(this.processor.bind(this));
    this.schedule.process(this.scheduleProcessor.bind(this));

    let schedules = await this.schedule.getRepeatableJobs();
    if (schedules.length > 1) {
      // Clean all schedules if duplicate
      await Promise.all(
        schedules.map((s) => this.schedule.removeRepeatable({ cron: s.cron }))
      );
      schedules = [];
    }

    const [schedule] = schedules;

    if (!schedule) {
      // Add schedule if not exists
      const cron = this.config.outbox.cron || '*/2 * * * * *';

      await this.schedule.add(null, {
        repeat: { cron },
      });
    } else if (
      this.config.outbox.cron &&
      this.config.outbox.cron !== schedule.cron
    ) {
      // Empty old schedule and update new one
      await this.schedule.removeRepeatable({
        cron: schedule.cron,
      });

      await this.schedule.add(null, {
        repeat: { cron: this.config.outbox.cron },
      });
    }
  }

  async add(message: MessagePackage | MessagePackage[]) {
    if (Array.isArray(message)) {
      await this.command.addBulk(
        message.map((m) => ({
          data: m,
          opts: {
            jobId: m.id,
            removeOnComplete: true,
            removeOnFail: true,
          },
        }))
      );
    } else {
      await this.command.add(message, {
        jobId: message.id,
        removeOnComplete: true,
        removeOnFail: true,
      });
    }
  }

  private async scheduleProcessor(_job: Job, done: CallableFunction) {
    const message = await this.outbox.list();
    await this.add(message);

    done();
  }

  private async processor(job: Job, done: CallableFunction) {
    try {
      const message: MessagePackage = job.data;
      message.payload = Buffer.from(message.payload);

      await this.broker.emit(message);
      await this.outbox.remove(message.id);
      done();
    } catch (err) {
      done(err);
    }
  }
}
