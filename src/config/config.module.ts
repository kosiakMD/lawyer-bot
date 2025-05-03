import { ConfigModule } from '@nestjs/config';
import botConfig from './global.config';

export const configurationModule = ConfigModule.forRoot({
  isGlobal: true,
  // envFilePath: fileNames.map((file) => getEnvPath(file)),
  load: [botConfig],
});
