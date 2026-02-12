/**
 * Körklar Tab Screen
 *
 * Feature-flagged on featureKorklar.
 * Shows readiness score, category breakdown, strengths/weaknesses, tips.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Award,
  Calendar,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { useSchool } from '@/contexts/school-context';
import { useTheme } from '@/contexts/theme-context';
import { fetchKorklarStatus } from '@/services/mobile-api';

export default function KorklarScreen() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { config } = useSchool();
  const { colors } = useTheme();

  const korklarQuery = useQuery({
    queryKey: ['korklar'],
    queryFn: () => fetchKorklarStatus(config!.apiBaseUrl, accessToken ?? undefined),
    enabled: !!config?.apiBaseUrl && !!accessToken,
  });

  const data = korklarQuery.data?.data;

  if (korklarQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={korklarQuery.isFetching}
            onRefresh={() => korklarQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={[styles.title, { color: colors.text }]}>Körklar</Text>

        {data ? (
          <>
            {/* Readiness Score Ring */}
            <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.grayMid }]}>
              <View style={[styles.scoreRing, {
                borderColor: data.readinessScore >= 80 ? colors.success :
                  data.readinessScore >= 50 ? colors.warning : colors.error,
              }]}>
                <Text style={[styles.scoreValue, { color: colors.text }]}>
                  {data.readinessScore}
                </Text>
                <Text style={[styles.scorePercent, { color: colors.slate }]}>%</Text>
              </View>
              <Text style={[styles.levelLabel, {
                color: data.readinessScore >= 80 ? colors.success :
                  data.readinessScore >= 50 ? colors.warning : colors.primary,
              }]}>
                {data.readinessLevel}
              </Text>
              {data.predictedReadinessDate && (
                <View style={styles.dateRow}>
                  <Calendar size={14} color={colors.slate} />
                  <Text style={[styles.dateText, { color: colors.slate }]}>
                    Beräknad körklar: {new Date(data.predictedReadinessDate).toLocaleDateString('sv-SE')}
                  </Text>
                </View>
              )}
            </View>

            {/* Category Scores */}
            {data.categoryScores && data.categoryScores.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  <Target size={16} color={colors.primary} /> Kategorier
                </Text>
                {data.categoryScores.map((cat, index) => (
                  <View key={index} style={styles.categoryRow}>
                    <Text style={[styles.categoryLabel, { color: colors.text }]}>{cat.category}</Text>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.grayLight }]}>
                      <View style={[styles.progressBarFill, {
                        backgroundColor: (cat.score / cat.maxScore) >= 0.8 ? colors.success :
                          (cat.score / cat.maxScore) >= 0.5 ? colors.warning : colors.error,
                        width: `${Math.min(100, (cat.score / cat.maxScore) * 100)}%`,
                      }]} />
                    </View>
                    <Text style={[styles.categoryScore, { color: colors.slate }]}>
                      {cat.score}/{cat.maxScore}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Strengths */}
            {data.strengths && data.strengths.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <TrendingUp size={16} color={colors.success} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Styrkor</Text>
                </View>
                {data.strengths.map((s, i) => (
                  <Text key={i} style={[styles.listItem, { color: colors.text }]}>• {s}</Text>
                ))}
              </View>
            )}

            {/* Weaknesses */}
            {data.weaknesses && data.weaknesses.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <TrendingDown size={16} color={colors.error} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Förbättringsområden</Text>
                </View>
                {data.weaknesses.map((w, i) => (
                  <Text key={i} style={[styles.listItem, { color: colors.text }]}>• {w}</Text>
                ))}
              </View>
            )}

            {/* Personalized Tips */}
            {data.personalizedTips && data.personalizedTips.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Lightbulb size={16} color={colors.warning} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Tips</Text>
                </View>
                {data.personalizedTips.map((tip, i) => (
                  <View key={i} style={[styles.tipCard, { backgroundColor: colors.warning + '15' }]}>
                    <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Certificate */}
            {data.eligibleForCertificate && (
              <View style={[styles.certificateCard, { backgroundColor: colors.success + '15', borderColor: colors.success }]}>
                <Award size={24} color={colors.success} />
                <Text style={[styles.certificateTitle, { color: colors.success }]}>
                  Grattis! Du är berättigad till certifikat
                </Text>
                <Text style={[styles.certificateText, { color: colors.text }]}>
                  Ditt körkortsintyg är klart att ladda ner.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.empty}>
            <Target size={48} color={colors.slate} />
            <Text style={[styles.emptyText, { color: colors.slate }]}>
              Körklar-data inte tillgänglig
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  scoreCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  scoreValue: { fontSize: 36, fontWeight: '800' },
  scorePercent: { fontSize: 18, fontWeight: '600', marginTop: 8 },
  levelLabel: { fontSize: 18, fontWeight: '700', marginTop: 12, textTransform: 'capitalize' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dateText: { fontSize: 13 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  categoryLabel: { flex: 1, fontSize: 14 },
  progressBarBg: { flex: 2, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  categoryScore: { width: 50, textAlign: 'right', fontSize: 13 },
  listItem: { fontSize: 14, marginBottom: 4, paddingLeft: 4 },
  tipCard: { padding: 12, borderRadius: 8, marginBottom: 8 },
  tipText: { fontSize: 14, lineHeight: 20 },
  certificateCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  certificateTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  certificateText: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, marginTop: 12 },
});
