import type {
  MethodInfo,
  NamedRecordType,
  SerializerConfig,
  TransporterConfig,
} from '@williele/broker';

export interface DependencyConfig {
  name: string;
  serializer?: SerializerConfig;
  transporter?: TransporterConfig;
}

export interface GenerateConfig {
  dir: string;
  forNest?: boolean;
  dependencies: {
    [name: string]: DependencyConfig;
  };
}

export interface ServiceConfig {
  name: string;
  serializer?: SerializerConfig;
  transporter?: TransporterConfig;
  generate?: GenerateConfig;
}

export interface BrokerCLIConfig {
  serializer: SerializerConfig;
  transporter: TransporterConfig;

  services: {
    [name: string]: ServiceConfig;
  };
}

export interface LocalServiceSchema {
  generate?: {
    output: string;
  };
  dependencies: {
    [name: string]: {
      serviceName: string;
      serializer: string;
      transporter: string;
      types: Record<string, NamedRecordType>;
      methods: Record<string, MethodInfo>;
    };
  };
}
