import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import {
  Card, Title, Paragraph, Button, Text, FAB, Portal, Modal,
  TextInput, List, IconButton, Chip, ActivityIndicator,
} from 'react-native-paper';
import { useAccountStore } from '../../store/accountStore';

export default function AccountsScreen() {
  const {
    accounts, fetchAccounts, isLoading, sendCode, verifyCode,
    verifyPassword, setMaster, updateAccount, deleteAccount,
  } = useAccountStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [step, setStep] = useState<'phone' | 'code' | 'password'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginId, setLoginId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSendCode = async () => {
    if (!phoneNumber) return;
    setAddLoading(true);
    setError('');
    try {
      const result = await sendCode(phoneNumber);
      setLoginId(result.loginId);
      setStep('code');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send code');
    } finally {
      setAddLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) return;
    setAddLoading(true);
    setError('');
    try {
      const result = await verifyCode(loginId, code);
      if (result.requiresPassword) {
        setStep('password');
      } else {
        resetAddModal();
        Alert.alert('Success', 'Account added successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setAddLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password) return;
    setAddLoading(true);
    setError('');
    try {
      await verifyPassword(loginId, password);
      resetAddModal();
      Alert.alert('Success', 'Account added successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Password verification failed');
    } finally {
      setAddLoading(false);
    }
  };

  const resetAddModal = () => {
    setShowAddModal(false);
    setStep('phone');
    setPhoneNumber('');
    setCode('');
    setPassword('');
    setLoginId('');
    setError('');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Account', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAccount(id) },
    ]);
  };

  const renderAccount = ({ item }: { item: any }) => (
    <Card style={styles.accountCard}>
      <Card.Content>
        <View style={styles.accountHeader}>
          <View style={{ flex: 1 }}>
            <Title>{item.displayName || item.phoneNumber}</Title>
            <Paragraph>@{item.username || 'no username'}</Paragraph>
            <Paragraph style={styles.phone}>{item.phoneNumber}</Paragraph>
          </View>
          <View style={styles.badges}>
            {item.isMaster && <Chip style={styles.masterChip} textStyle={{ color: '#fff' }}>Master</Chip>}
            <Chip
              style={[styles.statusChip, { backgroundColor: item.isActive ? '#4caf50' : '#f44336' }]}
              textStyle={{ color: '#fff' }}
            >
              {item.status}
            </Chip>
          </View>
        </View>
        <View style={styles.accountActions}>
          {!item.isMaster && (
            <Button compact onPress={() => setMaster(item.id)}>
              Set as Master
            </Button>
          )}
          <Button
            compact
            onPress={() => updateAccount(item.id, { isActive: !item.isActive })}
          >
            {item.isActive ? 'Disable' : 'Enable'}
          </Button>
          <IconButton icon="delete" iconColor="#f44336" onPress={() => handleDelete(item.id)} />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Telegram Accounts ({accounts.length}/50)</Title>

      {isLoading && accounts.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2AABEE" />
      ) : (
        <FlatList
          data={accounts}
          renderItem={renderAccount}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No accounts added yet. Tap + to add one.</Text>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        disabled={accounts.length >= 50}
      />

      <Portal>
        <Modal visible={showAddModal} onDismiss={resetAddModal} contentContainerStyle={styles.modal}>
          <Title style={styles.modalTitle}>Add Telegram Account</Title>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {step === 'phone' && (
            <>
              <TextInput
                label="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                mode="outlined"
                placeholder="+1234567890"
                keyboardType="phone-pad"
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={handleSendCode}
                loading={addLoading}
                disabled={addLoading}
              >
                Send Code
              </Button>
            </>
          )}

          {step === 'code' && (
            <>
              <Text style={styles.info}>Enter the code sent to {phoneNumber}</Text>
              <TextInput
                label="Verification Code"
                value={code}
                onChangeText={setCode}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={handleVerifyCode}
                loading={addLoading}
                disabled={addLoading}
              >
                Verify Code
              </Button>
            </>
          )}

          {step === 'password' && (
            <>
              <Text style={styles.info}>Two-factor authentication required</Text>
              <TextInput
                label="2FA Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={handleVerifyPassword}
                loading={addLoading}
                disabled={addLoading}
              >
                Verify Password
              </Button>
            </>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { padding: 16, fontSize: 20 },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  accountCard: { marginBottom: 12, elevation: 2 },
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  badges: { alignItems: 'flex-end', gap: 4 },
  masterChip: { backgroundColor: '#2AABEE' },
  statusChip: { height: 28 },
  phone: { color: '#666', fontSize: 12 },
  accountActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2AABEE' },
  modal: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 12 },
  modalTitle: { marginBottom: 16, textAlign: 'center' },
  input: { marginBottom: 12 },
  error: { color: '#d32f2f', textAlign: 'center', marginBottom: 12 },
  info: { color: '#666', marginBottom: 12 },
});
