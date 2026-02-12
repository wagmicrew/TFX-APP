/**
 * Admin Mobile Sessions & Push — UI Page
 *
 * React component for the admin dashboard.
 * Features:
 *   - Sessions table with search, filter, pagination
 *   - Kick (terminate) session action
 *   - Send push notification dialog
 *   - Push history tab
 *   - Stats overview cards
 *
 * Assumes your admin app uses:
 *   - React + TypeScript
 *   - Tailwind CSS (shadcn/ui style)
 *   - fetch or your API wrapper for calls
 *
 * Adjust imports to match your admin project's component library.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  deviceId: string;
  deviceName: string | null;
  deviceModel: string | null;
  platform: string;
  osVersion: string | null;
  appVersion: string | null;
  pushToken: string | null;
  ipAddress: string | null;
  isActive: boolean;
  lastActiveAt: string;
  lastSyncAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface PushNotification {
  id: string;
  targetType: string;
  targetId: string | null;
  title: string;
  body: string;
  status: string;
  sentCount: number;
  failedCount: number;
  sentAt: string;
}

interface Stats {
  totalSessions: number;
  activeSessions: number;
  activeDevices: number;
  pushSentToday: number;
  withPushToken: number;
  platformBreakdown: Record<string, number>;
}

// ─── API helpers ────────────────────────────────────────────────────────────

const API_BASE = '/api/admin/app-dashboard';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function MobileSessionsPage() {
  const [activeTab, setActiveTab] = useState<'sessions' | 'push' | 'history'>('sessions');
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiFetch<{ data: Stats }>('/stats')
      .then((r) => setStats(r.data))
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mobilapp — Sessioner & Push</h1>
          <p className="text-muted-foreground text-sm">
            Hantera aktiva sessioner, skicka pushnotiser och se historik
          </p>
        </div>
      </div>

      {/* Stats cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Tab buttons */}
      <div className="flex gap-2 border-b pb-2">
        {(['sessions', 'push', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-t px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'sessions' ? 'Sessioner' : tab === 'push' ? 'Skicka Push' : 'Push-historik'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'sessions' && <SessionsTab />}
      {activeTab === 'push' && <SendPushTab />}
      {activeTab === 'history' && <PushHistoryTab />}
    </div>
  );
}

// ─── Stats Cards ────────────────────────────────────────────────────────────

function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Aktiva sessioner', value: stats.activeSessions, icon: '📱' },
    { label: 'Unika enheter', value: stats.activeDevices, icon: '💻' },
    { label: 'Med push-token', value: stats.withPushToken, icon: '🔔' },
    { label: 'Push idag', value: stats.pushSentToday, icon: '📤' },
    { label: 'iOS', value: stats.platformBreakdown?.ios ?? 0, icon: '🍎' },
    { label: 'Android', value: stats.platformBreakdown?.android ?? 0, icon: '🤖' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{card.icon}</span>
            <span>{card.label}</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{card.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Sessions Tab ───────────────────────────────────────────────────────────

function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('active');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'ios' | 'android'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      params.set('page', String(page));
      params.set('limit', '25');

      const res = await apiFetch<{
        data: { sessions: Session[]; total: number; totalPages: number };
      }>(`/sessions?${params}`);

      setSessions(res.data.sessions);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, platformFilter, page]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleKick = async (sessionId: string, userName: string | null) => {
    if (!confirm(`Avsluta sessionen för ${userName ?? 'okänd användare'}?`)) return;

    try {
      await apiFetch('/sessions', {
        method: 'DELETE',
        body: JSON.stringify({ sessionId }),
      });
      fetchSessions(); // Refresh
    } catch (err) {
      alert(`Kunde inte avsluta session: ${err instanceof Error ? err.message : 'Fel'}`);
    }
  };

  const handleKickAll = async (userId: string, userName: string | null) => {
    if (!confirm(`Avsluta ALLA sessioner för ${userName ?? userId}?`)) return;

    try {
      await apiFetch(`/sessions/user/${userId}`, { method: 'DELETE' });
      fetchSessions();
    } catch (err) {
      alert(`Misslyckades: ${err instanceof Error ? err.message : 'Fel'}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Sök namn, e-post, enhet..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64 rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as any);
            setPage(1);
          }}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="all">Alla status</option>
          <option value="active">Aktiva</option>
          <option value="expired">Avslutade</option>
        </select>

        <select
          value={platformFilter}
          onChange={(e) => {
            setPlatformFilter(e.target.value as any);
            setPage(1);
          }}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="all">Alla plattformar</option>
          <option value="ios">iOS</option>
          <option value="android">Android</option>
        </select>

        <span className="text-sm text-gray-500">
          {total} {total === 1 ? 'session' : 'sessioner'}
        </span>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Användare</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Enhet</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Plattform</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">App-version</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Push</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Senast aktiv</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Åtgärder</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Laddar...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Inga sessioner hittades
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{session.userName ?? '—'}</div>
                    <div className="text-xs text-gray-500">{session.userEmail ?? session.userId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{session.deviceName ?? session.deviceId}</div>
                    <div className="text-xs text-gray-500">{session.deviceModel}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        session.platform === 'ios'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {session.platform === 'ios' ? '🍎 iOS' : '🤖 Android'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{session.appVersion ?? '—'}</td>
                  <td className="px-4 py-3">
                    {session.pushToken ? (
                      <span className="text-green-600" title={session.pushToken}>
                        ✓
                      </span>
                    ) : (
                      <span className="text-gray-400">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {session.lastActiveAt
                      ? new Date(session.lastActiveAt).toLocaleString('sv-SE')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {session.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Aktiv
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Avslutad
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {session.isActive && (
                        <button
                          onClick={() => handleKick(session.id, session.userName)}
                          title="Avsluta session"
                          className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                        >
                          Kicka
                        </button>
                      )}
                      <button
                        onClick={() => handleKickAll(session.userId, session.userName)}
                        title="Avsluta alla sessioner för denna användare"
                        className="rounded bg-orange-50 px-2 py-1 text-xs text-orange-600 hover:bg-orange-100"
                      >
                        Kicka alla
                      </button>
                      {session.pushToken && (
                        <button
                          onClick={() => {
                            // Quick push to this specific device
                            const msg = prompt('Meddelande att skicka till denna enhet:');
                            if (msg) {
                              apiFetch('/push', {
                                method: 'POST',
                                body: JSON.stringify({
                                  title: 'Meddelande',
                                  body: msg,
                                  targetType: 'device',
                                  targetId: session.pushToken,
                                }),
                              }).then(() => alert('Skickat!')).catch((e) => alert(`Fel: ${e.message}`));
                            }
                          }}
                          title="Skicka push till enhet"
                          className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100"
                        >
                          Push
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            ← Föregående
          </button>
          <span className="text-sm text-gray-500">
            Sida {page} av {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Nästa →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Send Push Tab ──────────────────────────────────────────────────────────

function SendPushTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'user' | 'device' | 'platform'>('all');
  const [targetId, setTargetId] = useState('');
  const [targetPlatform, setTargetPlatform] = useState<'ios' | 'android'>('ios');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!title || !body) {
      setError('Titel och meddelande krävs');
      return;
    }

    if ((targetType === 'user' || targetType === 'device') && !targetId) {
      setError(`Ange ${targetType === 'user' ? 'användar-ID' : 'push-token'}`);
      return;
    }

    setSending(true);
    setError('');
    setResult(null);

    try {
      const payload: Record<string, unknown> = {
        title,
        body,
        targetType,
        data: { notificationType: 'admin_broadcast' },
      };

      if (targetType === 'user' || targetType === 'device') {
        payload.targetId = targetId;
      }
      if (targetType === 'platform') {
        payload.targetPlatform = targetPlatform;
      }

      const res = await apiFetch<{ data: { sent: number; failed: number } }>('/push', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setResult(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skicka');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      {/* Target type */}
      <div>
        <label className="mb-1 block text-sm font-medium">Mottagare</label>
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value as any)}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="all">Alla enheter</option>
          <option value="user">Specifik användare</option>
          <option value="device">Specifik enhet</option>
          <option value="platform">Plattform</option>
        </select>
      </div>

      {/* Target ID (user or device) */}
      {(targetType === 'user' || targetType === 'device') && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            {targetType === 'user' ? 'Användar-ID (UUID)' : 'Push-token'}
          </label>
          <input
            type="text"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder={
              targetType === 'user'
                ? 'eb511794-80e9-4d52-8d05-...'
                : 'ExponentPushToken[xxx]'
            }
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
      )}

      {/* Platform selector */}
      {targetType === 'platform' && (
        <div>
          <label className="mb-1 block text-sm font-medium">Plattform</label>
          <select
            value={targetPlatform}
            onChange={(e) => setTargetPlatform(e.target.value as any)}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="ios">iOS</option>
            <option value="android">Android</option>
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="mb-1 block text-sm font-medium">Titel</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meddelande från trafikskolan"
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      {/* Body */}
      <div>
        <label className="mb-1 block text-sm font-medium">Meddelande</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Skriv ditt meddelande här..."
          rows={4}
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          ✓ Skickat: {result.sent} | Misslyckade: {result.failed}
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={sending}
        className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {sending ? 'Skickar...' : 'Skicka pushnotis'}
      </button>
    </div>
  );
}

// ─── Push History Tab ───────────────────────────────────────────────────────

function PushHistoryTab() {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        data: { notifications: PushNotification[]; totalPages: number };
      }>(`/push/history?page=${page}&limit=25`);
      setNotifications(res.data.notifications);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Failed to fetch push history:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const targetLabel = (type: string, id: string | null) => {
    switch (type) {
      case 'all':
        return 'Alla';
      case 'platform':
        return id === 'ios' ? '🍎 iOS' : '🤖 Android';
      case 'user':
        return `Användare: ${id?.slice(0, 8)}...`;
      case 'device':
        return `Enhet: ${id?.slice(0, 20)}...`;
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tid</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Titel</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Meddelande</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Mottagare</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Skickade</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Misslyckade</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Laddar...
                </td>
              </tr>
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Ingen push-historik ännu
                </td>
              </tr>
            ) : (
              notifications.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {new Date(n.sentAt).toLocaleString('sv-SE')}
                  </td>
                  <td className="px-4 py-3 font-medium">{n.title}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-500">{n.body}</td>
                  <td className="px-4 py-3">{targetLabel(n.targetType, n.targetId)}</td>
                  <td className="px-4 py-3 text-green-600">{n.sentCount}</td>
                  <td className="px-4 py-3 text-red-600">{n.failedCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        n.status === 'sent'
                          ? 'bg-green-100 text-green-700'
                          : n.status === 'partial'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {n.status === 'sent' ? 'Skickad' : n.status === 'partial' ? 'Delvis' : 'Misslyckad'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            ← Föregående
          </button>
          <span className="text-sm text-gray-500">
            Sida {page} av {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Nästa →
          </button>
        </div>
      )}
    </div>
  );
}
