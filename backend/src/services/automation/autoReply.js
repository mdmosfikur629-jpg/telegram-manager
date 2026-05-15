const { PrismaClient } = require('@prisma/client');
const TelegramAccountClient = require('../telegram/client');
const { decrypt } = require('../../utils/encryption');

const prisma = new PrismaClient();

class AutoReplyService {
  constructor(apiId, apiHash) {
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.activeRules = new Map(); // ruleId -> interval
  }

  async startAutoReply(rule) {
    const { targetAccountIds, config } = rule;
    const { keywords, replyText, matchType = 'contains' } = config;

    const interval = setInterval(async () => {
      for (const accountId of targetAccountIds) {
        try {
          const account = await prisma.telegramAccount.findUnique({
            where: { id: accountId },
          });
          if (!account || !account.isActive) continue;

          const sessionString = decrypt(account.sessionData);
          const client = new TelegramAccountClient(this.apiId, this.apiHash);
          await client.connect(sessionString);

          const dialogs = await client.getDialogs(10);

          for (const dialog of dialogs) {
            if (dialog.lastMessage && !dialog.lastMessage.isOut) {
              const text = dialog.lastMessage.text?.toLowerCase() || '';

              const matches = keywords.some(keyword => {
                const kw = keyword.toLowerCase();
                if (matchType === 'exact') return text === kw;
                if (matchType === 'startsWith') return text.startsWith(kw);
                return text.includes(kw); // contains
              });

              if (matches) {
                await client.sendMessage(dialog.id, replyText);
              }
            }
          }

          await client.disconnect();
        } catch (err) {
          console.error(`Auto-reply error for ${accountId}:`, err.message);
        }
      }
    }, config.checkInterval || 10000); // Default 10 seconds

    this.activeRules.set(rule.id, interval);
  }

  async stopAutoReply(ruleId) {
    const interval = this.activeRules.get(ruleId);
    if (interval) {
      clearInterval(interval);
      this.activeRules.delete(ruleId);
    }
  }

  async stopAll() {
    for (const [ruleId] of this.activeRules) {
      await this.stopAutoReply(ruleId);
    }
  }
}

module.exports = AutoReplyService;
