const express = require('express');
const { PrismaClient } = require('@prisma/client');
const TelegramAccountClient = require('../services/telegram/client');
const { decrypt } = require('../utils/encryption');

const router = express.Router();
const prisma = new PrismaClient();

// Get unified inbox across all accounts
router.get('/inbox', async (req, res) => {
  try {
    const accounts = await prisma.telegramAccount.findMany({
      where: { userId: req.userId, isActive: true },
    });

    const allChats = [];

    for (const account of accounts) {
      try {
        const sessionString = decrypt(account.sessionData);
        const client = new TelegramAccountClient(
          process.env.TELEGRAM_API_ID,
          process.env.TELEGRAM_API_HASH
        );
        await client.connect(sessionString);
        const dialogs = await client.getDialogs(50);
        await client.disconnect();

        for (const dialog of dialogs) {
          allChats.push({
            ...dialog,
            accountId: account.id,
            accountName: account.displayName || account.phoneNumber,
          });
        }
      } catch (err) {
        console.error(`Error fetching chats for ${account.id}:`, err.message);
      }
    }

    // Sort by last message date
    allChats.sort((a, b) => {
      const dateA = a.lastMessage?.date || 0;
      const dateB = b.lastMessage?.date || 0;
      return dateB - dateA;
    });

    res.json({ chats: allChats });
  } catch (err) {
    console.error('Inbox error:', err);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

// Get messages for a specific chat on a specific account
router.get('/:accountId/chat/:chatId', async (req, res) => {
  try {
    const { accountId, chatId } = req.params;
    const { limit = 50 } = req.query;

    const account = await prisma.telegramAccount.findFirst({
      where: { id: accountId, userId: req.userId },
    });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const sessionString = decrypt(account.sessionData);
    const client = new TelegramAccountClient(
      process.env.TELEGRAM_API_ID,
      process.env.TELEGRAM_API_HASH
    );
    await client.connect(sessionString);
    const messages = await client.getMessages(chatId, parseInt(limit));
    await client.disconnect();

    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message from a specific account
router.post('/:accountId/send', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { chatId, message } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({ error: 'Chat ID and message required' });
    }

    const account = await prisma.telegramAccount.findFirst({
      where: { id: accountId, userId: req.userId },
    });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const sessionString = decrypt(account.sessionData);
    const client = new TelegramAccountClient(
      process.env.TELEGRAM_API_ID,
      process.env.TELEGRAM_API_HASH
    );
    await client.connect(sessionString);
    const result = await client.sendMessage(chatId, message);
    await client.disconnect();

    // Save to database
    await prisma.message.create({
      data: {
        telegramId: BigInt(result.id),
        chatId: BigInt(chatId),
        content: message,
        direction: 'sent',
        senderAccountId: accountId,
      },
    });

    res.json({ message: result });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Send message from multiple accounts (bulk)
router.post('/bulk-send', async (req, res) => {
  try {
    const { accountIds, chatId, message, delay = 1000 } = req.body;

    if (!accountIds?.length || !chatId || !message) {
      return res.status(400).json({ error: 'Account IDs, chat ID, and message required' });
    }

    const results = [];
    for (let i = 0; i < accountIds.length; i++) {
      const accountId = accountIds[i];
      try {
        const account = await prisma.telegramAccount.findFirst({
          where: { id: accountId, userId: req.userId },
        });
        if (!account) {
          results.push({ accountId, status: 'error', error: 'Account not found' });
          continue;
        }

        const sessionString = decrypt(account.sessionData);
        const client = new TelegramAccountClient(
          process.env.TELEGRAM_API_ID,
          process.env.TELEGRAM_API_HASH
        );
        await client.connect(sessionString);
        const result = await client.sendMessage(chatId, message);
        await client.disconnect();

        results.push({ accountId, status: 'success', messageId: result.id });

        // Stagger messages to avoid rate limits
        if (i < accountIds.length - 1) {
          await new Promise(r => setTimeout(r, delay));
        }
      } catch (err) {
        results.push({ accountId, status: 'error', error: err.message });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('Bulk send error:', err);
    res.status(500).json({ error: 'Failed to send bulk messages' });
  }
});

module.exports = router;
