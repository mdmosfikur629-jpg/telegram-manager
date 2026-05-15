const express = require('express');
const { PrismaClient } = require('@prisma/client');
const TelegramAccountClient = require('../services/telegram/client');
const { encrypt } = require('../utils/encryption');

const router = express.Router();
const prisma = new PrismaClient();

// Temp store for pending login flows
const pendingLogins = new Map();

// Send OTP to phone number
router.post('/login/send-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const client = new TelegramAccountClient(
      process.env.TELEGRAM_API_ID,
      process.env.TELEGRAM_API_HASH
    );
    await client.connect();
    const result = await client.sendCode(phoneNumber);

    // Store client and hash for verification step
    const loginId = `${req.userId}_${Date.now()}`;
    pendingLogins.set(loginId, {
      client,
      phoneNumber,
      phoneCodeHash: result.phoneCodeHash,
      userId: req.userId,
      createdAt: Date.now(),
    });

    // Clean up old pending logins (> 5 min)
    for (const [key, value] of pendingLogins) {
      if (Date.now() - value.createdAt > 5 * 60 * 1000) {
        pendingLogins.delete(key);
      }
    }

    res.json({ loginId, message: 'OTP sent to phone number' });
  } catch (err) {
    console.error('Send code error:', err);
    res.status(500).json({ error: err.message || 'Failed to send code' });
  }
});

// Verify OTP and complete login
router.post('/login/verify', async (req, res) => {
  try {
    const { loginId, code } = req.body;
    if (!loginId || !code) {
      return res.status(400).json({ error: 'Login ID and code required' });
    }

    const pending = pendingLogins.get(loginId);
    if (!pending || pending.userId !== req.userId) {
      return res.status(400).json({ error: 'Invalid or expired login session' });
    }

    const { client, phoneNumber, phoneCodeHash } = pending;
    const result = await client.signIn(phoneNumber, code, phoneCodeHash);

    if (!result.success) {
      if (result.error === '2FA_REQUIRED') {
        return res.json({ requiresPassword: true, loginId });
      }
      return res.status(400).json({ error: result.message });
    }

    // Get account info
    const me = await client.getMe();
    const sessionString = client.session.save();

    // Save to database
    const account = await prisma.telegramAccount.create({
      data: {
        phoneNumber,
        sessionData: encrypt(sessionString),
        displayName: [me.firstName, me.lastName].filter(Boolean).join(' '),
        username: me.username,
        userId: req.userId,
        isMaster: false,
      },
    });

    pendingLogins.delete(loginId);
    await client.disconnect();

    res.json({
      account: {
        id: account.id,
        phoneNumber: account.phoneNumber,
        displayName: account.displayName,
        username: account.username,
        isMaster: account.isMaster,
      },
    });
  } catch (err) {
    console.error('Verify code error:', err);
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

// Verify 2FA password
router.post('/login/verify-password', async (req, res) => {
  try {
    const { loginId, password } = req.body;
    const pending = pendingLogins.get(loginId);
    if (!pending || pending.userId !== req.userId) {
      return res.status(400).json({ error: 'Invalid or expired login session' });
    }

    const { client, phoneNumber } = pending;
    const result = await client.signInWithPassword(password);

    if (!result.success) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const me = await client.getMe();
    const sessionString = client.session.save();

    const account = await prisma.telegramAccount.create({
      data: {
        phoneNumber,
        sessionData: encrypt(sessionString),
        displayName: [me.firstName, me.lastName].filter(Boolean).join(' '),
        username: me.username,
        userId: req.userId,
        isMaster: false,
      },
    });

    pendingLogins.delete(loginId);
    await client.disconnect();

    res.json({
      account: {
        id: account.id,
        phoneNumber: account.phoneNumber,
        displayName: account.displayName,
        username: account.username,
      },
    });
  } catch (err) {
    console.error('Verify password error:', err);
    res.status(500).json({ error: err.message || 'Password verification failed' });
  }
});

// List user's accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await prisma.telegramAccount.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
        username: true,
        isActive: true,
        isMaster: true,
        accountGroup: true,
        status: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
    res.json({ accounts });
  } catch (err) {
    console.error('List accounts error:', err);
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

// Update account (set master, group, etc.)
router.put('/:id', async (req, res) => {
  try {
    const { isMaster, accountGroup, isActive } = req.body;
    const data = {};

    if (isMaster !== undefined) {
      // Unset current master first
      if (isMaster) {
        await prisma.telegramAccount.updateMany({
          where: { userId: req.userId, isMaster: true },
          data: { isMaster: false },
        });
      }
      data.isMaster = isMaster;
    }
    if (accountGroup !== undefined) data.accountGroup = accountGroup;
    if (isActive !== undefined) data.isActive = isActive;

    const account = await prisma.telegramAccount.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ account });
  } catch (err) {
    console.error('Update account error:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete account
router.delete('/:id', async (req, res) => {
  try {
    await prisma.telegramAccount.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
