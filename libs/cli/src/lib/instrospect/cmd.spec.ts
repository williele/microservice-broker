import { Configure } from '../config/config';
import { introspect } from './cmd';

describe('Introspect', () => {
  it('should introspect', async () => {
    const config = new Configure('');

    await introspect(config);
  });
});
