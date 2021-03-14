import { DefaultSerializer } from './default-serializer';

describe('DefaultSerializer', () => {
  it('should demo', () => {
    const serializer = new DefaultSerializer({});

    const Todo = serializer.addType({
      name: 'Todo',
      type: 'record',
      fields: {
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
      },
    });

    const TodoList = serializer.addType({
      name: 'TodoList',
      type: 'array',
      items: { type: 'pointer', pointer: Todo },
    });

    const value = [
      { name: 'todo 1', description: null },
      { name: 'todo 2', description: 'awesome 2' },
      { name: 'todo 3', description: null },
      { name: 'todo 4', description: 'this is todo 4' },
    ];
    const encode = serializer.encode(TodoList, value, false);

    console.log('json', JSON.stringify(value).length);
    console.log('buffer', encode.length);

    const AddTodoInput = serializer.addType({
      name: 'AddTodoInput',
      type: 'record',
      fields: {
        name: { type: 'string', min: 4 },
        description: { type: 'string', min: 4, nullable: true },
      },
    });

    const inputEncode = serializer.encode(AddTodoInput, {
      name: 'demo',
      description: 'demo description',
    });
    const inputDecode = serializer.decode(AddTodoInput, inputEncode);
    console.log(inputDecode);
  });
});
