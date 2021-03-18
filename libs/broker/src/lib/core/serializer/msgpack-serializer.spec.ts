import { MsgPackSerializer } from './msgpack-serializer';

describe('MsgPackSerializer', () => {
  it('should demo', () => {
    const serializer = new MsgPackSerializer();

    serializer.addType({
      name: 'Demo',
      type: 'string',
    });

    const value = { name: 'Hello, world' };
    const encode = serializer.encode('Demo', value);
    console.log(JSON.stringify(value).length);
    console.log(encode.length);
    console.log(serializer.decode('Demo', encode));
  });
});
