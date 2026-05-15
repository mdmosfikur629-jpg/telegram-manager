import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Text, IconButton, Surface, ActivityIndicator } from 'react-native-paper';
import api from '../../services/api';

interface Message {
  id: number;
  text: string;
  date: number;
  fromId: string;
  isOut: boolean;
  media?: { type: string };
}

export default function ChatScreen({ route }: any) {
  const { chatId, chatTitle, accountId, accountName } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${accountId}/chat/${chatId}`);
      setMessages(res.data.messages.reverse());
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await api.post(`/messages/${accountId}/send`, {
        chatId,
        message: text,
      });
      setMessages((prev) => [
        ...prev,
        { id: res.data.message.id, text, date: res.data.message.date, isOut: true, fromId: 'me' },
      ]);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageBubble, item.isOut ? styles.sent : styles.received]}>
      <Text style={[styles.messageText, item.isOut && styles.sentText]}>{item.text}</Text>
      <Text style={[styles.messageTime, item.isOut && styles.sentTime]}>
        {formatTime(item.date)}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2AABEE" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Surface style={styles.accountBar}>
        <Text style={styles.accountText}>via {accountName}</Text>
      </Surface>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <Surface style={styles.inputBar}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          mode="outlined"
          placeholder="Type a message..."
          style={styles.input}
          dense
          right={sending ? <TextInput.Icon icon="loading" /> : null}
        />
        <IconButton
          icon="send"
          iconColor="#2AABEE"
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        />
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  accountBar: { padding: 8, backgroundColor: '#e8f4fd', elevation: 1 },
  accountText: { fontSize: 12, color: '#2AABEE', textAlign: 'center' },
  messageList: { padding: 8, paddingBottom: 16 },
  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 16,
    marginBottom: 6,
    elevation: 1,
  },
  sent: {
    alignSelf: 'flex-end',
    backgroundColor: '#2AABEE',
    borderBottomRightRadius: 4,
  },
  received: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, color: '#333' },
  sentText: { color: '#fff' },
  messageTime: { fontSize: 10, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
  sentTime: { color: '#d0e8ff' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    elevation: 4,
  },
  input: { flex: 1, maxHeight: 40 },
});
