import { Tabs } from "expo-router";
import { Home, User, MessageSquare } from "lucide-react-native";
import React from "react";
import { TFX } from "@/constants/colors";

export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TFX.blue,
        tabBarInactiveTintColor: TFX.slate,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TFX.white,
          borderTopWidth: 1,
          borderTopColor: TFX.grayMid,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hem",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
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
          title: "Profil",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
