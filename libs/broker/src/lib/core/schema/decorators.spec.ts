import { Record, Field, getRecordData } from './decorators';
import { ArvoSerializer } from '../../serializers/arvo-serializer';

describe('Record decorators', () => {
  it('should construct schema correctly', () => {
    @Record()
    class Test {
      @Field({ type: 'string', order: 1 })
      name: string;

      @Field({ type: 'long', order: 2 })
      age: number;
    }

    const serializer = new ArvoSerializer();

    serializer.addType(getRecordData(Test));

    const value: Test = { name: 'hello', age: 32 };
    const encode = serializer.encode(Test.name, value);
    console.log(serializer.decode(Test.name, encode));
  });
});
