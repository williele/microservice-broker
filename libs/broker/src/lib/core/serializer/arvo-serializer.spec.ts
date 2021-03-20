import { ArvoSerializer } from './arvo-serializer';
import { Record, Field } from '../schema';

describe('ArvoSerializer', () => {
  it('should work with decorator', () => {
    @Record()
    class Test {
      @Field(1, 'string')
      name: string;
    }

    const serializer = new ArvoSerializer({ name: 'arvo' });
    serializer.record(Test);

    const val: Test = {
      name: 'demo',
    };
    const encode = serializer.encode(Test.name, val);
    console.log(serializer.decode(Test.name, encode));
  });

  it('should ordering', () => {
    const serializer = new ArvoSerializer({ name: 'arvo' });

    serializer.record({
      name: 'A',
      type: 'record',
      fields: {
        name: { type: 'string', order: 1 },
        age: { type: 'int', order: 2 },
      },
    });

    serializer.record({
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
    const serializer = new ArvoSerializer({ name: 'arvo' });

    serializer.record({
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
