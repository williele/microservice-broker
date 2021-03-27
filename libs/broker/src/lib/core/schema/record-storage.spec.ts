import { Field, Record } from './decorators';
import { RecordStorage } from './record-storage';

@Record()
class Bar {
  @Field(1, 'string')
  name: string;
}

describe('RecordStorage', () => {
  let storage: RecordStorage;

  it('should initialize correctly', () => {
    storage = new RecordStorage([{ name: 'Foo', fields: {} }, Bar]);

    expect(storage.get('Foo')).toBeTruthy();
    expect(storage.get('Bar')).toBeTruthy();
  });

  it('should not duplicate class', () => {
    storage = new RecordStorage([Bar, { name: 'Foo', fields: {} }]);

    @Record({ name: 'Bar' })
    class Bar2 {}

    expect(() => storage.add(Bar2)).toThrow();
    expect(() => storage.add({ name: 'Foo', fields: {} })).toThrow();
  });

  it('should verify record', () => {
    storage = new RecordStorage([]);

    expect(() => storage.add({ name: 'awesom e', fields: {} })).toThrow();
    expect(() =>
      storage.add({
        name: 'Foo',
        fields: { 'demo ': { order: 1, type: 'string' } },
      })
    ).toThrow();
    expect(() =>
      storage.add({
        name: 'Bar',
        fields: {
          name: { order: 1, type: 'string' },
          age: { order: 1, type: 'int' },
        },
      })
    ).toThrow();
  });
});
