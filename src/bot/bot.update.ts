import { Injectable, Logger } from '@nestjs/common';
import { Update, Ctx, Start, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BotService } from './bot.service';
import { locales, Locale } from '../messages/locales';
import { BotSession } from '../config/global.config';
import { Message } from 'telegraf/typings/core/types/typegram';
import { adminMessages } from '../messages/common/admin.messages';

interface CustomContext extends Context {
  session?: BotSession;
}

type ContactMessage = Message & {
  contact: {
    phone_number: string;
  };
};

@Injectable()
@Update()
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);

  constructor(private readonly botService: BotService) {}

  static getMainKeyboard(locale: Locale) {
    return [
      [{ text: locales[locale].buttons.askQuestion }],
      [{ text: locales[locale].buttons.orderService }],
      [{ text: locales[locale].buttons.getPrice }],
      [{ text: locales[locale].buttons.changeLanguage }],
    ];
  }

  @Start()
  async start(@Ctx() ctx: CustomContext) {
    this.logger.debug('Received /start command');
    this.logger.debug(`User: ${JSON.stringify(ctx.from)}`);

    if (!ctx.from) {
      this.logger.warn('No user info in start command');
      await ctx.reply(locales[Locale.UK].messages.error);
      return;
    }

    await ctx.reply(
      `🌐\n${locales[Locale.UK].welcomeWithLanguage}\n${locales[Locale.EN].welcomeWithLanguage}`,
      {
        reply_markup: {
          keyboard: [
            [{ text: locales[Locale.UK].language }],
            [{ text: locales[Locale.EN].language }],
          ],
          resize_keyboard: true,
        },
      },
    );
  }

  @On('text')
  async onMessage(@Ctx() ctx: CustomContext) {
    const text = (ctx.message as Message & { text: string }).text;
    const user = ctx.from;
    this.logger.debug('Received text message');
    this.logger.debug(`Text: ${text}`);
    this.logger.debug(`User: ${JSON.stringify(user)}`);
    this.logger.debug(`Session: ${JSON.stringify(ctx.session)}`);

    if (!user) {
      this.logger.warn('No user info in message');
      await ctx.reply(locales[Locale.UK].messages.error);
      return;
    }

    if (text === locales[Locale.UK].language) {
      this.logger.debug('Ukrainian language selected');
      ctx.session = { locale: Locale.UK };
      await ctx.reply(locales[Locale.UK].welcome, {
        reply_markup: {
          keyboard: BotUpdate.getMainKeyboard(Locale.UK),
          resize_keyboard: true,
        },
      });
      return;
    }

    if (text === locales[Locale.EN].language) {
      this.logger.debug('English language selected');
      ctx.session = { locale: Locale.EN };
      await ctx.reply(locales[Locale.EN].welcome, {
        reply_markup: {
          keyboard: BotUpdate.getMainKeyboard(Locale.EN),
          resize_keyboard: true,
        },
      });
      return;
    }

    if (!ctx.session?.locale) {
      this.logger.debug('No locale in session, starting over');
      await this.start(ctx);
      return;
    }

    const locale = ctx.session.locale;

    if (text === locales[locale].buttons.changeLanguage) {
      this.logger.debug('Change language button pressed');
      ctx.session = undefined;
      await this.start(ctx);
      return;
    }

    if (text === locales[locale].buttons.askQuestion) {
      this.logger.debug('Question button pressed');
      await ctx.reply(locales[locale].messages.writeQuestion, {
        reply_markup: {
          keyboard: [[{ text: locales[locale].buttons.backToMenu }]],
          resize_keyboard: true,
        },
      });
      ctx.session.action = 'question';
    } else if (text === locales[locale].buttons.orderService) {
      this.logger.debug('Service button pressed');
      if (!ctx.session?.phone) {
        await ctx.reply(locales[locale].messages.sendContact, {
          reply_markup: {
            keyboard: [
              [
                {
                  text: locales[locale].buttons.sendContact,
                  request_contact: true,
                },
              ],
              [{ text: locales[locale].buttons.backToMenu }],
            ],
            resize_keyboard: true,
          },
        });
        ctx.session.action = 'service';
        return;
      }
      await ctx.reply(locales[locale].messages.describeService, {
        reply_markup: {
          keyboard: [[{ text: locales[locale].buttons.backToMenu }]],
          resize_keyboard: true,
        },
      });
      ctx.session.action = 'service';
    } else if (text === locales[locale].buttons.getPrice) {
      this.logger.debug('Price button pressed');
      if (!ctx.session?.phone) {
        await ctx.reply(locales[locale].messages.sendContact, {
          reply_markup: {
            keyboard: [
              [
                {
                  text: locales[locale].buttons.sendContact,
                  request_contact: true,
                },
              ],
              [{ text: locales[locale].buttons.backToMenu }],
            ],
            resize_keyboard: true,
          },
        });
        ctx.session.action = 'price';
        return;
      }
      await ctx.reply(locales[locale].messages.describeService, {
        reply_markup: {
          keyboard: [[{ text: locales[locale].buttons.backToMenu }]],
          resize_keyboard: true,
        },
      });
      ctx.session.action = 'price';
    } else if (ctx.session?.action === 'question') {
      if (text === locales[locale].buttons.backToMenu) {
        this.logger.debug('Back to menu pressed');
        ctx.session.action = undefined;
        await ctx.reply(locales[locale].welcome, {
          reply_markup: {
            keyboard: BotUpdate.getMainKeyboard(locale),
            resize_keyboard: true,
          },
        });
        return;
      }
      this.logger.debug('Processing question');
      this.logger.debug(`Original text: ${text}`);
      this.logger.debug(`Original title: ${adminMessages.newQuestion}`);
      this.logger.debug(`|Action sending message from: ${user.username}`);

      const userInfo = `👤 @${user.username || '-'}`;
      const message = `❓ ${adminMessages.newQuestion}\n\n${userInfo}\n\n${text}`;
      this.logger.debug(`Final message to send:\n${message}`);

      try {
        await this.botService.sendToChannel(message, Locale.UK);
      } catch (error) {
        this.logger.error('Error sending message to channel:', error);
        throw error;
      }

      await ctx.reply(locales[locale].messages.questionSent, {
        reply_markup: {
          keyboard: BotUpdate.getMainKeyboard(locale),
          resize_keyboard: true,
        },
      });
      ctx.session.action = undefined;
    } else if (ctx.session?.action === 'price') {
      if (text === locales[locale].buttons.backToMenu) {
        this.logger.debug('Back to menu pressed');
        ctx.session.action = undefined;
        await ctx.reply(locales[locale].welcome, {
          reply_markup: {
            keyboard: BotUpdate.getMainKeyboard(locale),
            resize_keyboard: true,
          },
        });
        return;
      }
      this.logger.debug('Processing price request');
      if (!ctx.session.phone) {
        await ctx.reply(locales[locale].messages.sendContact, {
          reply_markup: {
            keyboard: [
              [
                {
                  text: locales[locale].buttons.sendContact,
                  request_contact: true,
                },
              ],
              [{ text: locales[locale].buttons.backToMenu }],
            ],
            resize_keyboard: true,
          },
        });
        return;
      }
      const userInfo =
        `${adminMessages.userInfo.name}: ${user.first_name} ${user.last_name || ''}` +
        `\n${adminMessages.userInfo.username}: @${user.username || '-'}` +
        `\n${adminMessages.userInfo.phone}: ${ctx.session.phone || '-'}` +
        `\n${adminMessages.userInfo.language}: ${locales[locale].language}`;
      const message = `💰 ${adminMessages.priceRequest}\n\n${userInfo}\n\n${adminMessages.serviceDescription}\n${text}`;
      await this.botService.sendToChannel(message, Locale.UK);
      await ctx.reply(locales[locale].messages.priceRequestSent, {
        reply_markup: {
          keyboard: BotUpdate.getMainKeyboard(locale),
          resize_keyboard: true,
        },
      });
      ctx.session.action = undefined;
    } else if (ctx.session?.action === 'service') {
      if (text === locales[locale].buttons.backToMenu) {
        this.logger.debug('Back to menu pressed');
        ctx.session.action = undefined;
        await ctx.reply(locales[locale].welcome, {
          reply_markup: {
            keyboard: BotUpdate.getMainKeyboard(locale),
            resize_keyboard: true,
          },
        });
        return;
      }
      this.logger.debug('Processing service request');
      if (!ctx.session.phone) {
        await ctx.reply(locales[locale].messages.sendContact, {
          reply_markup: {
            keyboard: [
              [
                {
                  text: locales[locale].buttons.sendContact,
                  request_contact: true,
                },
              ],
              [{ text: locales[locale].buttons.backToMenu }],
            ],
            resize_keyboard: true,
          },
        });
        return;
      }
      const userInfo =
        `${adminMessages.userInfo.name}: ${user.first_name} ${user.last_name || ''}` +
        `\n${adminMessages.userInfo.username}: @${user.username || '-'}` +
        `\n${adminMessages.userInfo.phone}: ${ctx.session.phone || '-'}` +
        `\n${adminMessages.userInfo.language}: ${locales[locale].language}`;
      const message = `📝 ${adminMessages.serviceRequest}\n\n${userInfo}\n\n${adminMessages.serviceDescription}\n${text}`;
      await this.botService.sendToChannel(message, Locale.UK);
      await ctx.reply(locales[locale].messages.serviceRequestSent, {
        reply_markup: {
          keyboard: BotUpdate.getMainKeyboard(locale),
          resize_keyboard: true,
        },
      });
      ctx.session.action = undefined;
    } else if (
      text === locales[Locale.UK].language ||
      text === locales[Locale.EN].language
    ) {
      // Ігноруємо вибір мови, якщо він не на початку
      return;
    } else if (text === locales[locale].buttons.backToMenu) {
      this.logger.debug('Back to menu pressed');
      ctx.session.action = undefined;
      await ctx.reply(locales[locale].welcome, {
        reply_markup: {
          keyboard: BotUpdate.getMainKeyboard(locale),
          resize_keyboard: true,
        },
      });
    } else {
      // Якщо немає action і це не вибір мови - це питання
      this.logger.debug('No action detected, treating as question');
      this.logger.debug(`Original text: ${text}`);
      this.logger.debug(`Original title: ${adminMessages.newQuestion}`);
      this.logger.debug('Action sending message from:', user.username);

      const userInfo = `👤 @${user.username || '-'}`;
      const message = `❓ ${adminMessages.newQuestion}\n\n${userInfo}\n\n${text}`;
      this.logger.debug('Message:', message);

      try {
        await this.botService.sendToChannel(message, Locale.UK);
      } catch (error) {
        this.logger.error('Error sending message to channel:', error);
        throw error;
      }

      await ctx.reply(locales[locale].messages.questionSent, {
        reply_markup: {
          keyboard: BotUpdate.getMainKeyboard(locale),
          resize_keyboard: true,
        },
      });
    }
  }

  @On('contact')
  async onContact(@Ctx() ctx: CustomContext) {
    const contact = (ctx.message as ContactMessage).contact;
    const locale = ctx.session?.locale || Locale.UK;
    const user = ctx.from;

    this.logger.debug('Received contact');
    this.logger.debug(`Contact: ${JSON.stringify(contact)}`);
    this.logger.debug(`User: ${JSON.stringify(user)}`);
    this.logger.debug(`Session: ${JSON.stringify(ctx.session)}`);

    if (!user) {
      this.logger.warn('No user info in contact message');
      await ctx.reply(locales[locale].messages.error);
      return;
    }

    if (ctx.session?.action === 'service') {
      this.logger.debug('Processing service request');
      ctx.session.phone = contact.phone_number;
      await ctx.reply(locales[locale].messages.describeService, {
        reply_markup: {
          keyboard: [[{ text: locales[locale].buttons.backToMenu }]],
          resize_keyboard: true,
        },
      });
    } else if (ctx.session?.action === 'price') {
      this.logger.debug('Processing price request');
      ctx.session.phone = contact.phone_number;
      await ctx.reply(locales[locale].messages.describeService, {
        reply_markup: {
          keyboard: [[{ text: locales[locale].buttons.backToMenu }]],
          resize_keyboard: true,
        },
      });
    }
  }
}
