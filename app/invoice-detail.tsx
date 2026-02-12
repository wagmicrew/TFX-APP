/**
 * Invoice Detail Screen
 *
 * Full invoice info, Swish/Qliro payment flows.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  CreditCard,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { useSchool } from '@/contexts/school-context';
import { useTheme } from '@/contexts/theme-context';
import { fetchInvoices, initiatePayment, getPaymentStatus } from '@/services/mobile-api';

type PaymentResult = 'idle' | 'pending' | 'completed' | 'failed' | 'cancelled';

export default function InvoiceDetailScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { config } = useSchool();
  const { colors } = useTheme();
  const [paymentState, setPaymentState] = useState<PaymentResult>('idle');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'all'],
    queryFn: () => fetchInvoices(config!.apiBaseUrl, accessToken ?? undefined),
    enabled: !!config?.apiBaseUrl && !!accessToken,
  });

  const invoice = (invoicesQuery.data?.data?.invoices ?? []).find(
    (inv: any) => inv.id === invoiceId,
  ) as any;

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const startPaymentPolling = useCallback(
    (paymentId: string) => {
      if (!config?.apiBaseUrl || !invoiceId) return;

      setPaymentState('pending');
      pollTimerRef.current = setInterval(async () => {
        try {
          const result = await getPaymentStatus(config.apiBaseUrl, invoiceId, paymentId);
          if (result.data?.status === 'completed') {
            clearInterval(pollTimerRef.current!);
            pollTimerRef.current = null;
            setPaymentState('completed');
            invoicesQuery.refetch();
          } else if (result.data?.status === 'failed' || result.data?.status === 'cancelled') {
            clearInterval(pollTimerRef.current!);
            pollTimerRef.current = null;
            setPaymentState(result.data.status);
          }
        } catch {
          // Continue polling
        }
      }, 3000);
    },
    [config?.apiBaseUrl, invoiceId, invoicesQuery],
  );

  const handleSwishPayment = async () => {
    if (!config?.apiBaseUrl || !invoiceId) return;
    setPaymentLoading(true);

    try {
      const result = await initiatePayment(config.apiBaseUrl, invoiceId, 'swish');
      if (!result.success || !result.data) {
        Alert.alert('Fel', result.error ?? 'Kunde inte starta Swish-betalning');
        return;
      }

      // Try deep link to Swish app first
      if (result.data.swishUrl) {
        const canOpen = await Linking.canOpenURL(result.data.swishUrl);
        if (canOpen) {
          await Linking.openURL(result.data.swishUrl);
        }
      }

      // Start polling for payment status
      startPaymentPolling(result.data.paymentId);
    } catch (error) {
      Alert.alert('Fel', 'Kunde inte starta betalningen');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleQliroPayment = async () => {
    if (!config?.apiBaseUrl || !invoiceId) return;
    setPaymentLoading(true);

    try {
      const result = await initiatePayment(config.apiBaseUrl, invoiceId, 'qliro');
      if (!result.success || !result.data) {
        Alert.alert('Fel', result.error ?? 'Kunde inte starta Qliro-betalning');
        return;
      }

      if (result.data.checkoutUrl) {
        // Navigate to WebView for Qliro checkout
        router.push(`/modal?url=${encodeURIComponent(result.data.checkoutUrl)}` as any);
      }

      startPaymentPolling(result.data.paymentId);
    } catch (error) {
      Alert.alert('Fel', 'Kunde inte starta betalningen');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatAmount = (amount: number) => `${amount.toLocaleString('sv-SE')} SEK`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('sv-SE');

  if (!invoice) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Faktura</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.slate }]}>Faktura kunde inte hittas</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Faktura</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Amount & Status */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grayMid }]}>
          <Text style={[styles.amount, { color: colors.text }]}>
            {formatAmount(invoice.amount)}
          </Text>
          <View style={[styles.statusBadge, {
            backgroundColor: invoice.status === 'paid' ? colors.success + '20' :
              invoice.status === 'overdue' ? colors.error + '20' : colors.warning + '20',
          }]}>
            <Text style={[styles.statusText, {
              color: invoice.status === 'paid' ? colors.success :
                invoice.status === 'overdue' ? colors.error : colors.warning,
            }]}>
              {invoice.status === 'paid' ? 'Betald' :
                invoice.status === 'overdue' ? 'Förfallen' : 'Obetald'}
            </Text>
          </View>
        </View>

        {/* Dates */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grayMid }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.slate }]}>Förfallodatum</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(invoice.dueDate)}</Text>
          </View>
          {invoice.paidAt && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.slate }]}>Betald</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(invoice.paidAt)}</Text>
            </View>
          )}
        </View>

        {/* Items */}
        {invoice.items && invoice.items.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grayMid }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Rader</Text>
            {invoice.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={[styles.itemDesc, { color: colors.text }]}>{item.description}</Text>
                <Text style={[styles.itemAmount, { color: colors.text }]}>
                  {formatAmount(item.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* PDF Link */}
        {invoice.pdfUrl && (
          <TouchableOpacity
            style={[styles.pdfButton, { borderColor: colors.primary }]}
            onPress={() => Linking.openURL(invoice.pdfUrl)}
          >
            <FileText size={18} color={colors.primary} />
            <Text style={[styles.pdfButtonText, { color: colors.primary }]}>Visa PDF</Text>
            <ExternalLink size={14} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Payment Result */}
        {paymentState === 'completed' && (
          <View style={[styles.resultCard, { backgroundColor: colors.success + '15' }]}>
            <CheckCircle size={32} color={colors.success} />
            <Text style={[styles.resultTitle, { color: colors.success }]}>Betalning genomförd!</Text>
          </View>
        )}
        {(paymentState === 'failed' || paymentState === 'cancelled') && (
          <View style={[styles.resultCard, { backgroundColor: colors.error + '15' }]}>
            <XCircle size={32} color={colors.error} />
            <Text style={[styles.resultTitle, { color: colors.error }]}>
              {paymentState === 'failed' ? 'Betalning misslyckades' : 'Betalning avbruten'}
            </Text>
          </View>
        )}
        {paymentState === 'pending' && (
          <View style={[styles.resultCard, { backgroundColor: colors.warning + '15' }]}>
            <ActivityIndicator color={colors.warning} />
            <Text style={[styles.resultTitle, { color: colors.warning }]}>Väntar på betalning...</Text>
          </View>
        )}

        {/* Payment Buttons */}
        {invoice.status !== 'paid' && paymentState === 'idle' && (
          <View style={styles.paymentSection}>
            <TouchableOpacity
              style={[styles.paymentButton, { backgroundColor: '#4CAF50' }]}
              onPress={handleSwishPayment}
              disabled={paymentLoading}
            >
              {paymentLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.paymentButtonText}>Betala med Swish</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentButton, { backgroundColor: colors.primary }]}
              onPress={handleQliroPayment}
              disabled={paymentLoading}
            >
              {paymentLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.paymentButtonText}>Betala med Qliro</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  amount: { fontSize: 32, fontWeight: '800', textAlign: 'center' },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  statusText: { fontSize: 14, fontWeight: '600' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  itemDesc: { fontSize: 14, flex: 1 },
  itemAmount: { fontSize: 14, fontWeight: '600' },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  pdfButtonText: { fontSize: 15, fontWeight: '600' },
  paymentSection: { gap: 12, marginTop: 8 },
  paymentButton: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  paymentButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },
});
