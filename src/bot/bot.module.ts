import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { BotConfig } from '../config/global.config';
import { session } from 'telegraf';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const botConfig = configService.get<BotConfig>('bot');
        if (!botConfig?.token) {
          throw new Error('TELEGRAM_BOT_TOKEN is not set');
        }
        return {
          token: botConfig.token,
          middlewares: [session()],
        };
      },
    }),
  ],
  providers: [BotService, BotUpdate],
  exports: [BotService],
})
export class BotModule {}
