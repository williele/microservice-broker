import { MsgPackSerializer } from './msgpack-serializer';

describe('MsgPackSerializer', () => {
  it('should demo', () => {
    const serializer = new MsgPackSerializer({ name: 'msgpack' });

    serializer.record({
      name: 'Demo',
      type: 'record',
      fields: {},
    });

    const value = { name: 'Hello, world' };
    const encode = serializer.encode('Demo', value);
    console.log(JSON.stringify(value).length);
    console.log(encode.length);
    console.log(serializer.decode('Demo', encode));
  });
});
