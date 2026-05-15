import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, Text, Surface, IconButton } from 'react-native-paper';
import { useAuthStore } from '../../store/authStore';
import { useAccountStore } from '../../store/accountStore';

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const { accounts, fetchAccounts, isLoading } = useAccountStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAccounts();
    setRefreshing(false);
  };

  const activeAccounts = accounts.filter((a) => a.isActive);
  const masterAccount = accounts.find((a) => a.isMaster);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Surface style={styles.header}>
        <View>
          <Title style={styles.welcome}>Welcome, {user?.name}</Title>
          <Text style={styles.subtitle}>Manage your Telegram accounts</Text>
        </View>
        <IconButton icon="logout" onPress={logout} />
      </Surface>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{accounts.length}</Title>
            <Paragraph>Total Accounts</Paragraph>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{activeAccounts.length}</Title>
            <Paragraph>Active</Paragraph>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{masterAccount ? 1 : 0}</Title>
            <Paragraph>Master</Paragraph>
          </Card.Content>
        </Card>
      </View>

      {masterAccount && (
        <Card style={styles.masterCard}>
          <Card.Content>
            <Text style={styles.masterLabel}>Master Account</Text>
            <Title>{masterAccount.displayName || masterAccount.phoneNumber}</Title>
            <Paragraph>@{masterAccount.username || 'no username'}</Paragraph>
          </Card.Content>
        </Card>
      )}

      <View style={styles.actions}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => navigation.navigate('Accounts')}
          style={styles.actionButton}
        >
          Add Account
        </Button>
        <Button
          mode="outlined"
          icon="message"
          onPress={() => navigation.navigate('Inbox')}
          style={styles.actionButton}
        >
          Open Inbox
        </Button>
        <Button
          mode="outlined"
          icon="robot"
          onPress={() => navigation.navigate('Automation')}
          style={styles.actionButton}
        >
          Automation
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2AABEE',
    elevation: 4,
  },
  welcome: { color: '#fff', fontSize: 22 },
  subtitle: { color: '#e0e0e0', marginTop: 4 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: { flex: 1, elevation: 2 },
  statNumber: { fontSize: 28, color: '#2AABEE', textAlign: 'center' },
  masterCard: { marginHorizontal: 16, marginBottom: 16, elevation: 2 },
  masterLabel: { color: '#2AABEE', fontWeight: 'bold', marginBottom: 4 },
  actions: { padding: 16, gap: 12 },
  actionButton: { paddingVertical: 4 },
});
