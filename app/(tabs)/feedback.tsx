import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Star,
  X,
  Clock,
  User,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSchool } from '@/contexts/school-context';
import { useAuth } from '@/contexts/auth-context';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const APP_SECRET = 'sk_trafikskola_prod_acbdca5a99ca581b2528d9da55d5be73';
const GLASS_BG_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/bp71ysa409vm7q49eewzw';

interface FeedbackItem {
  id: string;
  type: 'lesson' | 'theory' | 'general' | 'instructor';
  title: string;
  message: string;
  rating?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  instructor?: { id: string; name: string };
  lessonDate?: string;
  createdAt: string;
  readAt?: string;
  from?: string;
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just nu';
  if (mins < 60) return `${mins} min sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h sedan`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d sedan`;
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function getSentimentIcon(sentiment?: string) {
  switch (sentiment) {
    case 'positive':
      return <ThumbsUp size={14} color={TFX.green} />;
    case 'negative':
      return <ThumbsDown size={14} color={TFX.danger} />;
    default:
      return <MessageSquare size={14} color={TFX.blue} />;
  }
}

function getSentimentColor(sentiment?: string): string {
  switch (sentiment) {
    case 'positive': return TFX.green;
    case 'negative': return TFX.danger;
    default: return TFX.blue;
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'lesson': return 'Körlektion';
    case 'theory': return 'Teori';
    case 'instructor': return 'Instruktör';
    default: return 'Allmänt';
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'lesson': return TFX.blue;
    case 'theory': return TFX.teal;
    case 'instructor': return TFX.orange;
    default: return TFX.slate;
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={starStyles.container}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          color={i <= rating ? '#F5C518' : TFX.grayMid}
          fill={i <= rating ? '#F5C518' : 'none'}
        />
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 2,
  },
});

const FeedbackCard = React.memo(function FeedbackCard({
  item,
  onPress,
}: {
  item: FeedbackItem;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const accentColor = getSentimentColor(item.sentiment);
  const typeColor = getTypeColor(item.type);
  const isUnread = !item.readAt;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[cardStyles.container, isUnread && cardStyles.unread]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        testID={`feedback-${item.id}`}
      >
        <View style={cardStyles.leftStripe}>
          <View style={[cardStyles.stripe, { backgroundColor: accentColor }]} />
        </View>

        <View style={cardStyles.content}>
          <View style={cardStyles.topRow}>
            <View style={[cardStyles.typeBadge, { backgroundColor: typeColor + '15' }]}>
              {getSentimentIcon(item.sentiment)}
              <Text style={[cardStyles.typeText, { color: typeColor }]}>{getTypeLabel(item.type)}</Text>
            </View>
            <View style={cardStyles.topRight}>
              {isUnread && <View style={cardStyles.unreadDot} />}
              <Text style={cardStyles.timeText}>{formatRelativeDate(item.createdAt)}</Text>
            </View>
          </View>

          <Text style={cardStyles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={cardStyles.message} numberOfLines={2}>{item.message}</Text>

          <View style={cardStyles.bottomRow}>
            {item.rating !== undefined && item.rating > 0 && <StarRating rating={item.rating} />}
            {item.instructor && (
              <View style={cardStyles.instructorTag}>
                <User size={11} color={TFX.slate} />
                <Text style={cardStyles.instructorText}>{item.instructor.name}</Text>
              </View>
            )}
            <View style={cardStyles.chevronWrap}>
              <ChevronRight size={16} color={TFX.grayMid} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const cardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: TFX.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  unread: {
    backgroundColor: '#FAFEFF',
  },
  leftStripe: {
    width: 4,
  },
  stripe: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  content: {
    flex: 1,
    padding: 14,
    paddingLeft: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: TFX.blue,
  },
  timeText: {
    fontSize: 11,
    color: TFX.slate,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TFX.navy,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: TFX.slate,
    lineHeight: 18,
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  instructorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instructorText: {
    fontSize: 11,
    color: TFX.slate,
  },
  chevronWrap: {
    marginLeft: 'auto',
  },
});

function GlassmorphismPopup({
  item,
  visible,
  onClose,
}: {
  item: FeedbackItem | null;
  visible: boolean;
  onClose: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT * 0.3)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT * 0.3, duration: 200, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim, bgOpacity]);

  if (!item) return null;

  const accentColor = getSentimentColor(item.sentiment);
  const typeColor = getTypeColor(item.type);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={popupStyles.backdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
          <Image
            source={{ uri: GLASS_BG_URL }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={popupStyles.bgOverlay} />
        </Animated.View>

        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            popupStyles.glassCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={popupStyles.glassInner}>
            <View style={popupStyles.handleBar} />

            <View style={popupStyles.headerRow}>
              <View style={[popupStyles.typeBadgeLarge, { backgroundColor: typeColor + '20' }]}>
                {getSentimentIcon(item.sentiment)}
                <Text style={[popupStyles.typeTextLarge, { color: typeColor }]}>
                  {getTypeLabel(item.type)}
                </Text>
              </View>
              <TouchableOpacity
                style={popupStyles.closeBtn}
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={20} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>

            <Text style={popupStyles.title}>{item.title}</Text>

            {item.rating !== undefined && item.rating > 0 && (
              <View style={popupStyles.ratingRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={20}
                    color={i <= item.rating! ? '#F5C518' : 'rgba(255,255,255,0.25)'}
                    fill={i <= item.rating! ? '#F5C518' : 'none'}
                  />
                ))}
                <Text style={popupStyles.ratingText}>{item.rating}/5</Text>
              </View>
            )}

            <View style={popupStyles.divider} />

            <Text style={popupStyles.messageText}>{item.message}</Text>

            <View style={popupStyles.metaSection}>
              {item.instructor && (
                <View style={popupStyles.metaRow}>
                  <View style={popupStyles.metaIconWrap}>
                    <User size={14} color="rgba(255,255,255,0.7)" />
                  </View>
                  <View>
                    <Text style={popupStyles.metaLabel}>Instruktör</Text>
                    <Text style={popupStyles.metaValue}>{item.instructor.name}</Text>
                  </View>
                </View>
              )}

              {item.lessonDate && (
                <View style={popupStyles.metaRow}>
                  <View style={popupStyles.metaIconWrap}>
                    <Clock size={14} color="rgba(255,255,255,0.7)" />
                  </View>
                  <View>
                    <Text style={popupStyles.metaLabel}>Lektionsdatum</Text>
                    <Text style={popupStyles.metaValue}>{item.lessonDate}</Text>
                  </View>
                </View>
              )}

              {item.from && (
                <View style={popupStyles.metaRow}>
                  <View style={popupStyles.metaIconWrap}>
                    <MessageSquare size={14} color="rgba(255,255,255,0.7)" />
                  </View>
                  <View>
                    <Text style={popupStyles.metaLabel}>Från</Text>
                    <Text style={popupStyles.metaValue}>{item.from}</Text>
                  </View>
                </View>
              )}

              <View style={popupStyles.metaRow}>
                <View style={popupStyles.metaIconWrap}>
                  <Clock size={14} color="rgba(255,255,255,0.7)" />
                </View>
                <View>
                  <Text style={popupStyles.metaLabel}>Mottagen</Text>
                  <Text style={popupStyles.metaValue}>{formatRelativeDate(item.createdAt)}</Text>
                </View>
              </View>
            </View>

            <View style={[popupStyles.sentimentBanner, { backgroundColor: accentColor + '20' }]}>
              {getSentimentIcon(item.sentiment)}
              <Text style={[popupStyles.sentimentText, { color: accentColor }]}>
                {item.sentiment === 'positive' ? 'Positivt omdöme' :
                  item.sentiment === 'negative' ? 'Förbättringsområde' : 'Feedback'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const popupStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 43, 62, 0.45)',
  },
  glassCard: {
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'web' ? 20 : 0,
    maxHeight: SCREEN_HEIGHT * 0.82,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: Platform.OS === 'web' ? 28 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 28 : 0,
    overflow: 'hidden',
  },
  glassInner: {
    backgroundColor: Platform.OS === 'web'
      ? 'rgba(15, 43, 62, 0.72)'
      : 'rgba(15, 43, 62, 0.72)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'web' ? 28 : 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: Platform.OS === 'web' ? 28 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 28 : 0,
    ...(Platform.OS !== 'web' ? {} : {}),
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  typeBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeTextLarge: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 14,
  },
  messageText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    marginBottom: 18,
  },
  metaSection: {
    gap: 12,
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
  },
  metaValue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600' as const,
  },
  sentimentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sentimentText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
});

export default function FeedbackScreen() {
  const { config } = useSchool();
  const { accessToken } = useAuth();
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const feedbackQuery = useQuery({
    queryKey: ['feedback', config?.apiBaseUrl, accessToken],
    queryFn: async (): Promise<FeedbackItem[]> => {
      if (!config?.apiBaseUrl || !accessToken) return [];
      const url = `${config.apiBaseUrl}/student/feedback`;
      console.log('[Feedback] Fetching feedback from:', url);
      try {
        const res = await fetch(url, {
          headers: {
            'X-App-Secret': APP_SECRET,
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });
        if (!res.ok) {
          console.log('[Feedback] Fetch failed:', res.status);
          return [];
        }
        const data = await res.json();
        console.log('[Feedback] Response:', JSON.stringify(data).substring(0, 300));
        if (data.success && data.data?.feedback) {
          return data.data.feedback as FeedbackItem[];
        }
        return [];
      } catch (err) {
        console.log('[Feedback] Fetch error:', err);
        return [];
      }
    },
    enabled: !!config?.apiBaseUrl && !!accessToken,
    staleTime: 1000 * 60 * 5,
  });

  const handleOpenFeedback = useCallback((item: FeedbackItem) => {
    console.log('[Feedback] Opening item:', item.id);
    setSelectedItem(item);
    setPopupVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setPopupVisible(false);
    setTimeout(() => setSelectedItem(null), 300);
  }, []);

  const feedbackData = useMemo(() => feedbackQuery.data ?? [], [feedbackQuery.data]);
  const unreadCount = useMemo(() => feedbackData.filter(f => !f.readAt).length, [feedbackData]);

  const renderItem = useCallback(({ item }: { item: FeedbackItem }) => (
    <FeedbackCard item={item} onPress={() => handleOpenFeedback(item)} />
  ), [handleOpenFeedback]);

  const keyExtractor = useCallback((item: FeedbackItem) => item.id, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0B2A3C', '#0E3D56', '#0F4A6D']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <MessageSquare size={22} color={TFX.white} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Feedback</Text>
                <Text style={styles.headerSubtitle}>
                  {feedbackData.length > 0
                    ? `${feedbackData.length} omdömen${unreadCount > 0 ? ` · ${unreadCount} nya` : ''}`
                    : 'Dina omdömen'}
                </Text>
              </View>
            </View>
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {feedbackQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TFX.blue} />
          <Text style={styles.loadingText}>Hämtar feedback...</Text>
        </View>
      ) : feedbackData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Sparkles size={40} color={TFX.blue} />
          </View>
          <Text style={styles.emptyTitle}>Ingen feedback ännu</Text>
          <Text style={styles.emptyText}>
            Feedback från dina instruktörer och lektioner visas här
          </Text>
        </View>
      ) : (
        <FlatList
          data={feedbackData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          testID="feedback-list"
        />
      )}

      <GlassmorphismPopup
        item={selectedItem}
        visible={popupVisible}
        onClose={handleClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TFX.grayLight,
  },
  headerGradient: {
    paddingBottom: 18,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    fontFamily,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: TFX.danger,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontFamily,
    color: TFX.slate,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: TFX.blue + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily,
    color: TFX.slate,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  listContent: {
    paddingTop: 14,
    paddingBottom: 24,
  },
});
