import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import {
  Card, Title, Paragraph, Button, Text, FAB, Portal, Modal,
  TextInput, Switch, SegmentedButtons, Chip, ActivityIndicator,
} from 'react-native-paper';
import api from '../../services/api';
import { useAccountStore } from '../../store/accountStore';

interface AutomationRule {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  config: any;
  masterAccountId: string | null;
  targetAccountIds: string[];
}

export default function AutomationScreen() {
  const { accounts, fetchAccounts } = useAccountStore();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('mirror');
  const [keywords, setKeywords] = useState('');
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRules();
    fetchAccounts();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await api.get('/automation');
      setRules(res.data.rules);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createRule = async () => {
    if (!ruleName) return;
    setSaving(true);
    try {
      let config: any = {};
      if (ruleType === 'mirror') {
        config = { mirrorMessages: true, pollInterval: 30000 };
      } else if (ruleType === 'auto_reply') {
        config = {
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
          replyText,
          matchType: 'contains',
          checkInterval: 10000,
        };
      }

      const masterAccount = accounts.find((a) => a.isMaster);
      const targetAccountIds = accounts.filter((a) => !a.isMaster && a.isActive).map((a) => a.id);

      await api.post('/automation', {
        name: ruleName,
        type: ruleType,
        config,
        masterAccountId: masterAccount?.id,
        targetAccountIds,
      });

      setShowModal(false);
      resetForm();
      fetchRules();
    } catch (err) {
      console.error('Failed to create rule:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: AutomationRule) => {
    try {
      await api.put(`/automation/${rule.id}`, { isActive: !rule.isActive });
      fetchRules();
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const deleteRule = (id: string) => {
    Alert.alert('Delete Rule', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/automation/${id}`);
          fetchRules();
        },
      },
    ]);
  };

  const resetForm = () => {
    setRuleName('');
    setRuleType('mirror');
    setKeywords('');
    setReplyText('');
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mirror': return 'Mirror Mode';
      case 'auto_reply': return 'Auto Reply';
      case 'scheduled': return 'Scheduled';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mirror': return '#2AABEE';
      case 'auto_reply': return '#4caf50';
      case 'scheduled': return '#ff9800';
      default: return '#999';
    }
  };

  const renderRule = ({ item }: { item: AutomationRule }) => (
    <Card style={styles.ruleCard}>
      <Card.Content>
        <View style={styles.ruleHeader}>
          <View style={{ flex: 1 }}>
            <Title>{item.name}</Title>
            <Chip
              style={[styles.typeChip, { backgroundColor: getTypeColor(item.type) }]}
              textStyle={{ color: '#fff', fontSize: 11 }}
            >
              {getTypeLabel(item.type)}
            </Chip>
          </View>
          <Switch value={item.isActive} onValueChange={() => toggleRule(item)} color="#2AABEE" />
        </View>
        <Paragraph style={styles.targetCount}>
          {item.targetAccountIds.length} target accounts
        </Paragraph>
        <View style={styles.ruleActions}>
          <Button compact onPress={() => deleteRule(item.id)} textColor="#f44336">
            Delete
          </Button>
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
      <Title style={styles.title}>Automation Rules</Title>

      <FlatList
        data={rules}
        renderItem={renderRule}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No automation rules yet</Text>}
      />

      <FAB icon="plus" style={styles.fab} onPress={() => setShowModal(true)} />

      <Portal>
        <Modal visible={showModal} onDismiss={() => { setShowModal(false); resetForm(); }} contentContainerStyle={styles.modal}>
          <Title style={styles.modalTitle}>Create Automation Rule</Title>

          <TextInput
            label="Rule Name"
            value={ruleName}
            onChangeText={setRuleName}
            mode="outlined"
            style={styles.input}
          />

          <SegmentedButtons
            value={ruleType}
            onValueChange={setRuleType}
            buttons={[
              { value: 'mirror', label: 'Mirror' },
              { value: 'auto_reply', label: 'Auto Reply' },
            ]}
            style={styles.segment}
          />

          {ruleType === 'auto_reply' && (
            <>
              <TextInput
                label="Keywords (comma separated)"
                value={keywords}
                onChangeText={setKeywords}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Reply Text"
                value={replyText}
                onChangeText={setReplyText}
                mode="outlined"
                multiline
                style={styles.input}
              />
            </>
          )}

          <Button
            mode="contained"
            onPress={createRule}
            loading={saving}
            disabled={saving || !ruleName}
            style={styles.createButton}
          >
            Create Rule
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { padding: 16, fontSize: 20 },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  ruleCard: { marginBottom: 12, elevation: 2 },
  ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  typeChip: { alignSelf: 'flex-start', marginTop: 8, height: 26 },
  targetCount: { color: '#666', marginTop: 8 },
  ruleActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2AABEE' },
  modal: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 12 },
  modalTitle: { marginBottom: 16, textAlign: 'center' },
  input: { marginBottom: 12 },
  segment: { marginBottom: 12 },
  createButton: { marginTop: 8 },
});
