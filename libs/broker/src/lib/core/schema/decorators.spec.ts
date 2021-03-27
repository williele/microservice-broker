import { Record, Field, getRecordData, ArrayField } from './decorators';
import { ArvoSerializer } from '../serializer/arvo-serializer';
import { RecordStorage } from './record-storage';

describe('Record decorators', () => {
  it('should construct schema correctly', () => {
    @Record()
    class Foo {
      @Field(1, 'string')
      name: string;
    }

    @Record()
    class Test {
      @Field(1, 'string')
      name: string;
      @Field(2, 'long')
      age: number;
      @ArrayField(3, Foo)
      foo: Foo[];

      @ArrayField(4, 'int')
      bar: number[];
    }
    console.log(JSON.stringify(getRecordData(Test), null, 2));

    const storage = new RecordStorage([Test]);
    const serializer = new ArvoSerializer({ name: 'arvo' }, storage);

    const value: Test = {
      name: 'hello',
      age: 32,
      foo: [{ name: 'hello world' }, { name: 'demo' }],
      bar: [10, 3],
    };
    const encode = serializer.encode(Test.name, value);
    console.log(serializer.decode(Test.name, encode));
  });
});
