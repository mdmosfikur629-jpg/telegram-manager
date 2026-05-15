const TelegramAccountClient = require('./client');
const { decrypt } = require('../../utils/encryption');

class AccountManager {
  constructor(apiId, apiHash) {
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.clients = new Map(); // accountId -> TelegramAccountClient
    this.masterAccountId = null;
  }

  async loadAccount(accountId, encryptedSession) {
    if (this.clients.has(accountId)) {
      return this.clients.get(accountId);
    }

    const sessionString = decrypt(encryptedSession);
    const client = new TelegramAccountClient(this.apiId, this.apiHash);
    client.accountId = accountId;
    await client.connect(sessionString);
    this.clients.set(accountId, client);
    return client;
  }

  async loadAllAccounts(accounts) {
    const results = [];
    for (const account of accounts) {
      try {
        await this.loadAccount(account.id, account.sessionData);
        if (account.isMaster) {
          this.masterAccountId = account.id;
        }
        results.push({ id: account.id, status: 'connected' });
      } catch (err) {
        console.error(`Failed to load account ${account.id}:`, err.message);
        results.push({ id: account.id, status: 'failed', error: err.message });
      }
    }
    return results;
  }

  getClient(accountId) {
    return this.clients.get(accountId);
  }

  getMasterClient() {
    if (!this.masterAccountId) return null;
    return this.clients.get(this.masterAccountId);
  }

  async disconnectAccount(accountId) {
    const client = this.clients.get(accountId);
    if (client) {
      await client.disconnect();
      this.clients.delete(accountId);
    }
  }

  async disconnectAll() {
    for (const [id, client] of this.clients) {
      try {
        await client.disconnect();
      } catch (err) {
        console.error(`Error disconnecting ${id}:`, err.message);
      }
    }
    this.clients.clear();
  }

  getConnectedAccountIds() {
    return Array.from(this.clients.keys());
  }

  isAccountConnected(accountId) {
    return this.clients.has(accountId);
  }
}

module.exports = AccountManager;
