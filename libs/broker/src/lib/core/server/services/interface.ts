import { BrokerError } from '../../error';
import { RecordDefinition } from '../../schema';
import { HandleType, Middleware, RequestHandler } from '../interface';

export interface AddHandlerConfig {
  name: string;
  type: HandleType;
  description?: string;
  request?: string;
  response?: string;
  middlewares?: Middleware | Middleware[];
  /**
   * This properties is for saga service
   */
  handler: RequestHandler;
  tracing?: boolean;
}

export interface AddMethodConfig
  extends Omit<AddHandlerConfig, 'type' | 'request' | 'response'> {
  request: RecordDefinition;
  response: RecordDefinition;
}

export interface AddCommandConfig
  extends Omit<AddHandlerConfig, 'type' | 'request' | 'response'> {
  request: RecordDefinition;
}

export interface AddSagaConfig
  extends Omit<AddHandlerConfig, 'type' | 'request' | 'response' | 'handler'> {
  request: RecordDefinition;
  handler: (message, error?: BrokerError) => Promise<void> | void;
}
