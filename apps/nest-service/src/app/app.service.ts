import { NullRecord } from '@williele/broker';
import { Method, Service } from '@williele/broker-nest';

@Service('main')
export class AppService {
  @Method({
    request: NullRecord.name,
    response: NullRecord.name,
    tracing: true,
  })
  getData() {
    return null;
  }
}
