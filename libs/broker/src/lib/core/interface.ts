export interface BrokerConfig {
  serviceName: string;
}

export interface SerializerConfig {
  /**
   * If false skip validate before encode or after decode
   */
  validate?: boolean;
}
