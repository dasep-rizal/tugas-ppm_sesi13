import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#007AFF",
        tabBarPosition: "bottom",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="riwayat"
        options={{
          title: "Riwayat",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="history"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="absensi"
        options={{
          title: "Absensi",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="calendar-check"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/info-pribadi"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="profile/keamanan"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="absen/pengajuan-izin"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="absen/sakit"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="absen/cuti"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="jadwal-kerja"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
