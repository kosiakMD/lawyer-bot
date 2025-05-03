import { registerAs } from '@nestjs/config';
import { get } from 'env-var';
import { Locale } from '../messages/locales';

export type BotAction = 'question' | 'service' | 'price';

export interface BotSession {
  locale?: Locale;
  action?: BotAction;
  phone?: string;
}

export type BotConfig = {
  token: string;
  channel: string;
};

export default registerAs('bot', () => ({
  token: get('TELEGRAM_BOT_TOKEN').required().asString(),
  channel: get('TELEGRAM_CHANNEL').required().asString(),
}));
