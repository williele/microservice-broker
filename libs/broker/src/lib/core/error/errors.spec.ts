import { ValidateError } from './errors';

describe('BrokerError', () => {
  it('should ValidateError fields message generate correctly', () => {
    const error = ValidateError.fields({
      username: 'unique',
      password: 'incorrect',
    });

    expect(error.message).toBe('f>username:unique|password:incorrect');
  });
});
