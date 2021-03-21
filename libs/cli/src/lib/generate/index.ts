import { configReader, getServices } from '../utils/config-reader';
import { generateService } from './generate-service';

export async function generateCmd(configFile: string) {
  const config = await configReader(configFile);

  // Fetch list of generate service client
  await Promise.all(getServices(config).map((s) => generateService(s)));
}
