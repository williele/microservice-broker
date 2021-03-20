import { Field, Record } from '@williele/broker';

@Record()
export class DemoInput {
  @Field(1, 'string')
  name: string;
}

@Record()
export class DemoOutput {
  @Field(1, 'int')
  age: number;
}
