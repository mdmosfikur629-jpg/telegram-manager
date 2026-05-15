const express = require('express');
const { PrismaClient } = require('@prisma/client');
const MirrorService = require('../services/automation/mirror');
const AutoReplyService = require('../services/automation/autoReply');
const SchedulerService = require('../services/automation/scheduler');

const router = express.Router();
const prisma = new PrismaClient();

// Services will be initialized with io from app
let mirrorService, autoReplyService, schedulerService;

function initServices(io) {
  mirrorService = new MirrorService(io);
  autoReplyService = new AutoReplyService(
    process.env.TELEGRAM_API_ID,
    process.env.TELEGRAM_API_HASH
  );
  schedulerService = new SchedulerService(
    process.env.TELEGRAM_API_ID,
    process.env.TELEGRAM_API_HASH
  );
}

// Get all automation rules
router.get('/', async (req, res) => {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { userId: req.userId },
    });
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// Create automation rule
router.post('/', async (req, res) => {
  try {
    const { name, type, config, masterAccountId, targetAccountIds } = req.body;

    const rule = await prisma.automationRule.create({
      data: {
        name,
        type,
        config,
        masterAccountId,
        targetAccountIds: targetAccountIds || [],
        userId: req.userId,
      },
    });

    // Auto-start if active
    if (rule.isActive) {
      await startRule(rule);
    }

    res.json({ rule });
  } catch (err) {
    console.error('Create rule error:', err);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// Update automation rule
router.put('/:id', async (req, res) => {
  try {
    const { name, isActive, config, targetAccountIds } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (isActive !== undefined) data.isActive = isActive;
    if (config !== undefined) data.config = config;
    if (targetAccountIds !== undefined) data.targetAccountIds = targetAccountIds;

    const rule = await prisma.automationRule.update({
      where: { id: req.params.id },
      data,
    });

    // Handle activation/deactivation
    if (isActive !== undefined) {
      if (isActive) {
        await startRule(rule);
      } else {
        await stopRule(rule);
      }
    }

    res.json({ rule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// Delete automation rule
router.delete('/:id', async (req, res) => {
  try {
    const rule = await prisma.automationRule.findUnique({
      where: { id: req.params.id },
    });
    if (rule) {
      await stopRule(rule);
    }

    await prisma.automationRule.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// Schedule a message
router.post('/schedule', async (req, res) => {
  try {
    const { accountId, chatId, message, scheduledAt } = req.body;

    if (!schedulerService) {
      initServices(req.app.get('io'));
    }

    const result = await schedulerService.scheduleMessage(
      accountId, chatId, message, scheduledAt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to schedule message' });
  }
});

async function startRule(rule) {
  if (!mirrorService) {
    initServices(require('../index').io);
  }

  switch (rule.type) {
    case 'mirror':
      await mirrorService.startMirror(rule, process.env.TELEGRAM_API_ID, process.env.TELEGRAM_API_HASH);
      break;
    case 'auto_reply':
      await autoReplyService.startAutoReply(rule);
      break;
  }
}

async function stopRule(rule) {
  switch (rule.type) {
    case 'mirror':
      if (mirrorService) await mirrorService.stopMirror(rule.id);
      break;
    case 'auto_reply':
      if (autoReplyService) await autoReplyService.stopAutoReply(rule.id);
      break;
  }
}

module.exports = router;
module.exports.initServices = initServices;
