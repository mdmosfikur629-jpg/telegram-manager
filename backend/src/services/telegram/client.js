const { TelegramClient } = require('gramjs');
const { StringSession } = require('gramjs/sessions');
const { Api } = require('gramjs/tl');
const { encrypt, decrypt } = require('../../utils/encryption');

class TelegramAccountClient {
  constructor(apiId, apiHash) {
    this.apiId = parseInt(apiId);
    this.apiHash = apiHash;
    this.client = null;
    this.phoneNumber = null;
    this.sessionString = null;
    this.isConnected = false;
    this.accountId = null;
  }

  async connect(sessionString = null) {
    const session = new StringSession(sessionString || '');
    this.client = new TelegramClient(session, this.apiId, this.apiHash, {
      connectionRetries: 5,
      useWSS: false,
    });
    await this.client.connect();
    this.isConnected = true;
    return this;
  }

  async sendCode(phoneNumber) {
    this.phoneNumber = phoneNumber;
    if (!this.client) await this.connect();
    const result = await this.client.sendCode(
      { apiId: this.apiId, apiHash: this.apiHash },
      phoneNumber
    );
    return result;
  }

  async signIn(phoneNumber, phoneCode, phoneCodeHash) {
    try {
      await this.client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCode,
          phoneCodeHash,
        })
      );
      this.sessionString = this.client.session.save();
      return { success: true, session: this.sessionString };
    } catch (err) {
      if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        return { success: false, error: '2FA_REQUIRED', message: 'Two-factor authentication required' };
      }
      throw err;
    }
  }

  async signInWithPassword(password) {
    try {
      await this.client.signIn({ password });
      this.sessionString = this.client.session.save();
      return { success: true, session: this.sessionString };
    } catch (err) {
      throw err;
    }
  }

  async getMe() {
    if (!this.client) throw new Error('Client not connected');
    const me = await this.client.getMe();
    return {
      id: me.id.toString(),
      firstName: me.firstName,
      lastName: me.lastName,
      username: me.username,
      phone: me.phone,
    };
  }

  async getDialogs(limit = 100) {
    if (!this.client) throw new Error('Client not connected');
    const dialogs = await this.client.getDialogs({ limit });
    return dialogs.map(d => ({
      id: d.id?.toString(),
      title: d.title,
      isGroup: d.isGroup,
      isChannel: d.isChannel,
      isUser: d.isUser,
      unreadCount: d.unreadCount,
      lastMessage: d.message ? {
        text: d.message.message,
        date: d.message.date,
        fromId: d.message.fromId?.toString(),
        isOut: d.message.out,
      } : null,
    }));
  }

  async getMessages(chatId, limit = 50) {
    if (!this.client) throw new Error('Client not connected');
    const messages = await this.client.getMessages(chatId, { limit });
    return messages.map(m => ({
      id: m.id,
      text: m.message,
      date: m.date,
      fromId: m.fromId?.toString(),
      media: m.media ? { type: m.media.className } : null,
      isOut: m.out,
    }));
  }

  async sendMessage(chatId, message) {
    if (!this.client) throw new Error('Client not connected');
    const result = await this.client.sendMessage(chatId, { message });
    return {
      id: result.id,
      text: result.message,
      date: result.date,
    };
  }

  async sendMedia(chatId, file, caption = '') {
    if (!this.client) throw new Error('Client not connected');
    const result = await this.client.sendFile(chatId, { file, caption });
    return { id: result.id, date: result.date };
  }

  async joinGroup(inviteLink) {
    if (!this.client) throw new Error('Client not connected');
    const result = await this.client.invoke(
      new Api.messages.ImportChatInvite({ hash: inviteLink.split('+')[1] || inviteLink })
    );
    return result;
  }

  async forwardMessages(chatId, fromChatId, messageIds) {
    if (!this.client) throw new Error('Client not connected');
    const result = await this.client.forwardMessages(chatId, {
      fromPeer: fromChatId,
      messages: messageIds,
    });
    return result;
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }
}

module.exports = TelegramAccountClient;
