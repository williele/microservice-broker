import { Record } from './schema';

export const CONNECT_EVENT = 'connect';
export const DISCONNECT_EVENT = 'disconnect';
export const RECONNECT_EVENT = 'reconnect';
export const ERROR_EVENT = 'error';

@Record()
export class Null {}
