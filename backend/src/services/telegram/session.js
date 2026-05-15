const { PrismaClient } = require('@prisma/client');
const { encrypt, decrypt } = require('../../utils/encryption');

const prisma = new PrismaClient();

async function saveSession(accountId, sessionString) {
  const encrypted = encrypt(sessionString);
  await prisma.telegramAccount.update({
    where: { id: accountId },
    data: { sessionData: encrypted },
  });
}

async function getSession(accountId) {
  const account = await prisma.telegramAccount.findUnique({
    where: { id: accountId },
  });
  if (!account) return null;
  return decrypt(account.sessionData);
}

async function removeSession(accountId) {
  await prisma.telegramAccount.update({
    where: { id: accountId },
    data: { sessionData: '' },
  });
}

module.exports = { saveSession, getSession, removeSession };
