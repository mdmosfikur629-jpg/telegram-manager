const { PrismaClient } = require('@prisma/client');
const TelegramAccountClient = require('../telegram/client');
const { decrypt } = require('../../utils/encryption');

const prisma = new PrismaClient();

class MirrorService {
  constructor(io) {
    this.io = io;
    this.activeMirrors = new Map(); // ruleId -> interval
  }

  async startMirror(rule, apiId, apiHash) {
    const { masterAccountId, targetAccountIds } = rule;
    const config = rule.config;

    // Load master account
    const masterAccount = await prisma.telegramAccount.findUnique({
      where: { id: masterAccountId },
    });
    if (!masterAccount) throw new Error('Master account not found');

    const masterSession = decrypt(masterAccount.sessionData);
    const masterClient = new TelegramAccountClient(apiId, apiHash);
    await masterClient.connect(masterSession);

    // Poll for new messages on master account
    const interval = setInterval(async () => {
      try {
        const dialogs = await masterClient.getDialogs(20);

        for (const targetId of targetAccountIds) {
          try {
            const targetAccount = await prisma.telegramAccount.findUnique({
              where: { id: targetId },
            });
            if (!targetAccount || !targetAccount.isActive) continue;

            const targetSession = decrypt(targetAccount.sessionData);
            const targetClient = new TelegramAccountClient(apiId, apiHash);
            await targetClient.connect(targetSession);

            // Mirror actions based on config
            if (config.mirrorMessages) {
              // Get recent messages from master and forward to targets
              for (const dialog of dialogs) {
                if (dialog.lastMessage) {
                  try {
                    await targetClient.sendMessage(dialog.id, dialog.lastMessage.text);
                  } catch (err) {
                    console.error(`Mirror send failed for ${targetId}:`, err.message);
                  }
                }
              }
            }

            await targetClient.disconnect();
          } catch (err) {
            console.error(`Mirror target ${targetId} error:`, err.message);
          }
        }
      } catch (err) {
        console.error('Mirror polling error:', err.message);
      }
    }, config.pollInterval || 30000); // Default 30 seconds

    this.activeMirrors.set(rule.id, { interval, masterClient });
  }

  async stopMirror(ruleId) {
    const mirror = this.activeMirrors.get(ruleId);
    if (mirror) {
      clearInterval(mirror.interval);
      await mirror.masterClient.disconnect();
      this.activeMirrors.delete(ruleId);
    }
  }

  async stopAll() {
    for (const [ruleId] of this.activeMirrors) {
      await this.stopMirror(ruleId);
    }
  }
}

module.exports = MirrorService;
