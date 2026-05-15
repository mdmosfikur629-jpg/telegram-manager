import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Text, Searchbar, Chip, ActivityIndicator } from 'react-native-paper';
import api from '../../services/api';

interface Chat {
  id: string;
  title: string;
  isGroup: boolean;
  isChannel: boolean;
  isUser: boolean;
  unreadCount: number;
  lastMessage: { text: string; date: number } | null;
  accountId: string;
  accountName: string;
}

export default function InboxScreen({ navigation }: any) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await api.get('/messages/inbox');
      setChats(res.data.chats);
      setFilteredChats(res.data.chats);
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredChats(
        chats.filter(
          (c) =>
            c.title.toLowerCase().includes(query) ||
            c.accountName.toLowerCase().includes(query) ||
            c.lastMessage?.text?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredChats(chats);
    }
  }, [searchQuery, chats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInbox();
    setRefreshing(false);
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const getChatIcon = (chat: Chat) => {
    if (chat.isChannel) return 'bullhorn';
    if (chat.isGroup) return 'account-group';
    return 'account';
  };

  const renderChat = ({ item }: { item: Chat }) => (
    <Card
      style={styles.chatCard}
      onPress={() => navigation.navigate('Chat', {
        chatId: item.id,
        chatTitle: item.title,
        accountId: item.accountId,
        accountName: item.accountName,
      })}
    >
      <Card.Content style={styles.chatContent}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.title[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Title style={styles.chatTitle} numberOfLines={1}>{item.title}</Title>
            <Text style={styles.time}>{formatDate(item.lastMessage?.date)}</Text>
          </View>
          <View style={styles.chatMeta}>
            <Paragraph style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage?.text || 'No messages'}
            </Paragraph>
            {item.unreadCount > 0 && (
              <Chip style={styles.badge} textStyle={styles.badgeText}>
                {item.unreadCount}
              </Chip>
            )}
          </View>
          <Text style={styles.accountLabel}>{item.accountName}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2AABEE" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search chats..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.search}
      />
      <FlatList
        data={filteredChats}
        renderItem={renderChat}
        keyExtractor={(item) => `${item.accountId}_${item.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No chats found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  search: { margin: 8, elevation: 2 },
  chatCard: { marginHorizontal: 8, marginBottom: 4, elevation: 1 },
  chatContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2AABEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatTitle: { fontSize: 16, flex: 1 },
  time: { fontSize: 12, color: '#999' },
  chatMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { color: '#666', flex: 1, fontSize: 14 },
  badge: { backgroundColor: '#2AABEE', height: 24, minWidth: 24 },
  badgeText: { color: '#fff', fontSize: 11 },
  accountLabel: { fontSize: 11, color: '#2AABEE', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
});
