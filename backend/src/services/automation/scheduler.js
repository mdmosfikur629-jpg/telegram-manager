const { PrismaClient } = require('@prisma/client');
const TelegramAccountClient = require('../telegram/client');
const { decrypt } = require('../../utils/encryption');

const prisma = new PrismaClient();

class SchedulerService {
  constructor(apiId, apiHash) {
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.scheduledJobs = new Map(); // jobId -> timeout
  }

  async scheduleMessage(accountId, chatId, message, scheduledAt) {
    const delay = new Date(scheduledAt).getTime() - Date.now();
    if (delay <= 0) {
      await this.sendMessage(accountId, chatId, message);
      return { sent: true };
    }

    const jobId = `${accountId}_${Date.now()}`;
    const timeout = setTimeout(async () => {
      await this.sendMessage(accountId, chatId, message);
      this.scheduledJobs.delete(jobId);
    }, delay);

    this.scheduledJobs.set(jobId, timeout);
    return { jobId, scheduledAt, delay };
  }

  async sendMessage(accountId, chatId, message) {
    try {
      const account = await prisma.telegramAccount.findUnique({
        where: { id: accountId },
      });
      if (!account) throw new Error('Account not found');

      const sessionString = decrypt(account.sessionData);
      const client = new TelegramAccountClient(this.apiId, this.apiHash);
      await client.connect(sessionString);
      const result = await client.sendMessage(chatId, message);
      await client.disconnect();

      await prisma.message.create({
        data: {
          telegramId: BigInt(result.id),
          chatId: BigInt(chatId),
          content: message,
          direction: 'sent',
          senderAccountId: accountId,
        },
      });

      return result;
    } catch (err) {
      console.error('Scheduled send error:', err.message);
      throw err;
    }
  }

  cancelJob(jobId) {
    const timeout = this.scheduledJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledJobs.delete(jobId);
      return true;
    }
    return false;
  }

  cancelAll() {
    for (const [jobId] of this.scheduledJobs) {
      this.cancelJob(jobId);
    }
  }

  getActiveJobs() {
    return Array.from(this.scheduledJobs.keys());
  }
}

module.exports = SchedulerService;
