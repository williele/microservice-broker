import { ArrayField, Field, Record } from '@williele/broker';

@Record()
export class DemoInput {
  @Field(1, 'string')
  name: string;
}

@Record()
export class DemoOutput {
  @Field(1, 'string')
  message: string;
}

@Record()
export class DemoListInput {
  @Field(1, { type: 'string', min: 2 })
  name: string;

  @Field(2, { type: 'int', min: 5 })
  length: number;
}

@Record()
export class DemoListOutput {
  @ArrayField(1, DemoOutput)
  list: DemoOutput[];
}
