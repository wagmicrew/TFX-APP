import { Tabs } from "expo-router";
import { Home, User, MessageSquare, GraduationCap, FileText, Car } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/theme-context";
import { useAppConfig } from "@/contexts/app-config-context";

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isFeatureEnabled } = useAppConfig();

  const showLms = isFeatureEnabled('featureLms');
  const showProfile = isFeatureEnabled('featureProfile');
  const showInvoices = isFeatureEnabled('featureInvoices');
  const showKorklar = isFeatureEnabled('featureKorklar');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.slate,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.grayMid,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.welcomeTo', 'Hem'),
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="lms"
        options={{
          title: t('lmsScreen.title', 'LMS'),
          tabBarIcon: ({ color }) => <GraduationCap size={24} color={color} />,
          href: showLms ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Fakturor',
          tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
          href: showInvoices ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="korklar"
        options={{
          title: 'Körklar',
          tabBarIcon: ({ color }) => <Car size={24} color={color} />,
          href: showKorklar ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          title: "Feedback",
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title', 'Profil'),
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
          href: showProfile ? undefined : null,
        }}
      />
    </Tabs>
  );
}
