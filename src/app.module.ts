import { Module } from '@nestjs/common';
import { BotModule } from './bot/bot.module';
import { configurationModule } from './config/config.module';

@Module({
  imports: [configurationModule, BotModule],
})
export class AppModule {}
