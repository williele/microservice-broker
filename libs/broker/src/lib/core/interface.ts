export interface BrokerConfig {
  serviceName: string;
}

export interface SerializerConfig {
  /**
   * If false skip validate before encode
   */
  encodeValidate?: boolean;
  /**
   * If false skip validate after decode
   */
  decodeValidate?: boolean;
}
