import { Injectable, Logger } from '@nestjs/common';
import { Context, Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { BotConfig } from '../config/global.config';
import { locales, Locale } from '../messages/locales';
import { InjectBot } from 'nestjs-telegraf';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly botConfig: BotConfig;

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get<BotConfig>('bot');
    if (!config) {
      throw new Error('Bot config is not set');
    }
    this.botConfig = config;
    this.logger.debug('BotService initialized');
  }

  private getLanguageButtons() {
    this.logger.debug('Getting language buttons');
    return [
      [
        { text: locales[Locale.UK].language },
        { text: locales[Locale.UK].language },
      ],
    ];
  }

  private getLangReplyMarkup() {
    this.logger.debug('Getting language reply markup');
    return {
      keyboard: this.getLanguageButtons(),
      resize_keyboard: true,
    };
  }

  async sendToChannel(message: string, locale: Locale = Locale.UK) {
    this.logger.debug('Sending to channel');
    this.logger.debug(`Message: ${message}`);
    this.logger.debug(`Locale: ${locale}`);
    await this.bot.telegram.sendMessage(this.botConfig.channel, message);
    // try {
    //   await this.bot.telegram.sendMessage(this.botConfig.channel, message, {
    //     parse_mode: 'MarkdownV2',
    //   });
    // } catch (error) {
    //   this.logger.error('Failed to send message to channel', error);
    //   throw error;
    // }
  }
}
