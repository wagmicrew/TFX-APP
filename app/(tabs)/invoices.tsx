/**
 * Invoices Tab Screen
 *
 * Feature-flagged on featureInvoices.
 * Segment tabs: Alla / Obetalda / Betalda / Förfallna.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FileText, Clock, AlertCircle, CheckCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { useSchool } from '@/contexts/school-context';
import { useTheme } from '@/contexts/theme-context';
import { fetchInvoices } from '@/services/mobile-api';

type InvoiceFilter = 'all' | 'unpaid' | 'paid' | 'overdue';

const FILTERS: { key: InvoiceFilter; label: string }[] = [
  { key: 'all', label: 'Alla' },
  { key: 'unpaid', label: 'Obetalda' },
  { key: 'paid', label: 'Betalda' },
  { key: 'overdue', label: 'Förfallna' },
];

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidAt?: string;
  items: Array<{ description: string; amount: number }>;
  pdfUrl?: string;
}

export default function InvoicesScreen() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { config } = useSchool();
  const { colors } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<InvoiceFilter>('all');

  const invoicesQuery = useQuery({
    queryKey: ['invoices', filter],
    queryFn: () => fetchInvoices(config!.apiBaseUrl, accessToken ?? undefined, filter === 'all' ? undefined : filter),
    enabled: !!config?.apiBaseUrl && !!accessToken,
  });

  const invoices: Invoice[] = (invoicesQuery.data?.data?.invoices ?? []) as Invoice[];
  const summary = invoicesQuery.data?.data?.summary;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} color={colors.success} />;
      case 'overdue': return <AlertCircle size={16} color={colors.error} />;
      case 'unpaid': return <Clock size={16} color={colors.warning} />;
      default: return <FileText size={16} color={colors.slate} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Betald';
      case 'unpaid': return 'Obetald';
      case 'overdue': return 'Förfallen';
      case 'cancelled': return 'Avbruten';
      default: return status;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toLocaleString('sv-SE')} ${currency || 'SEK'}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE');
  };

  const renderInvoice = useCallback(({ item }: { item: Invoice }) => (
    <TouchableOpacity
      style={[styles.invoiceCard, { backgroundColor: colors.card, borderColor: colors.grayMid }]}
      onPress={() => router.push(`/invoice-detail?invoiceId=${item.id}` as any)}
    >
      <View style={styles.invoiceHeader}>
        <View style={styles.invoiceStatus}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusLabel, {
            color: item.status === 'paid' ? colors.success :
              item.status === 'overdue' ? colors.error : colors.warning
          }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
        <Text style={[styles.invoiceAmount, { color: colors.text }]}>
          {formatAmount(item.amount, item.currency)}
        </Text>
      </View>
      <View style={styles.invoiceDetails}>
        <Text style={[styles.invoiceLabel, { color: colors.slate }]}>
          Förfallodatum: {formatDate(item.dueDate)}
        </Text>
        {item.paidAt && (
          <Text style={[styles.invoiceLabel, { color: colors.slate }]}>
            Betald: {formatDate(item.paidAt)}
          </Text>
        )}
      </View>
      {item.items.length > 0 && (
        <Text style={[styles.itemSummary, { color: colors.slate }]} numberOfLines={1}>
          {item.items.map(i => i.description).join(', ')}
        </Text>
      )}
    </TouchableOpacity>
  ), [colors, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: colors.text }]}>Fakturor</Text>

      {/* Summary Bar */}
      {summary && (
        <View style={[styles.summaryBar, { backgroundColor: colors.primary + '10' }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              {summary.totalUnpaid?.toLocaleString('sv-SE') ?? 0} SEK
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.slate }]}>Obetalt</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.grayMid }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {summary.totalOverdue?.toLocaleString('sv-SE') ?? 0} SEK
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.slate }]}>Förfallet</Text>
          </View>
          {summary.nextDueDate && (
            <>
              <View style={[styles.summaryDivider, { backgroundColor: colors.grayMid }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formatDate(summary.nextDueDate)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.slate }]}>Nästa</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterTab,
              filter === f.key && { backgroundColor: colors.primary },
              filter !== f.key && { backgroundColor: colors.grayLight },
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[
              styles.filterLabel,
              { color: filter === f.key ? colors.white : colors.slate },
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Invoice List */}
      {invoicesQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoice}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={invoicesQuery.isFetching}
              onRefresh={() => invoicesQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <FileText size={48} color={colors.slate} />
              <Text style={[styles.emptyText, { color: colors.slate }]}>
                Inga fakturor att visa
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  summaryLabel: { fontSize: 12, marginTop: 2 },
  summaryDivider: { width: 1, marginVertical: 4 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterLabel: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  invoiceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  invoiceAmount: { fontSize: 18, fontWeight: '700' },
  invoiceDetails: { marginTop: 8 },
  invoiceLabel: { fontSize: 13, marginTop: 2 },
  itemSummary: { fontSize: 12, marginTop: 6 },
  loader: { flex: 1, justifyContent: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, marginTop: 12 },
});
