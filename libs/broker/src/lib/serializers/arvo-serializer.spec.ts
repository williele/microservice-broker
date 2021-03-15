import { ArvoSerializer } from './arvo-serializer';

describe('ArvoSerializer', () => {
  it('should demo', () => {
    const serializer = new ArvoSerializer();

    serializer.addType({
      name: 'Demo',
      type: 'record',
      fields: {
        name: 'string',
        age: { type: 'int', nullable: true },
      },
    });

    const val = {
      name: 'williele',
      age: 22,
    };

    const encode = serializer.encode('Demo', val);
    console.log('json', JSON.stringify(val).length);
    console.log('arvo', encode.length);
    console.log(serializer.decode('Demo', encode));
  });
});
