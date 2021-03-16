import { ArvoSerializer } from './arvo-serializer';

describe('ArvoSerializer', () => {
  it('should ordering', () => {
    const serializer = new ArvoSerializer();

    serializer.addType({
      name: 'A',
      type: 'record',
      fields: {
        name: { type: 'string', order: 1 },
        age: { type: 'int', order: 2 },
      },
    });

    serializer.addType({
      name: 'B',
      type: 'record',
      fields: {
        number: { type: 'int', order: 2 },
        string: { type: 'string', order: 1 },
      },
    });

    const encode = serializer.encode('A', { name: 'my name', age: 22 });
    console.log(serializer.decode('B', encode));
  });

  it('should demo', () => {
    const serializer = new ArvoSerializer();

    serializer.addType({
      name: 'Demo',
      type: 'record',
      fields: {
        name: { type: 'string', order: 1 },
        age: { type: 'int', nullable: true, order: 2 },
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
