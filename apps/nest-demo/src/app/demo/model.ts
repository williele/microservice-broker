import { Field, Record } from '@wi/broker';

@Record()
export class DemoInput {
  @Field({ type: 'string', order: 1 })
  name: string;
}

@Record()
export class DemoOutput {
  @Field({ type: 'int', order: 2 })
  age: number;
}
