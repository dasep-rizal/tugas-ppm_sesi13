import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";

type ActionButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const ActionButton = memo(
  ({ title, onPress, disabled, style }: ActionButtonProps) => (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabledButton, style]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  )
);

ActionButton.displayName = "ActionButton";

export default function Index() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const userEmail = useMemo(() => user?.email ?? "-", [user?.email]);

  const reportFatalError = useCallback((source: string, error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan tak dikenal";
    console.error(`[FATAL] ${source}: ${message}`, error);
    setFatalError(message);
  }, []);

  const resetError = useCallback(() => {
    setFatalError(null);
    console.log("[INFO] Error state has been reset");
  }, []);

  const checkTodayAttendance = useCallback(async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "attendance"),
        where("userId", "==", user.uid),
        where("date", "==", today)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0];
        setDocId(data.id);
        setCheckInTime(data.data().checkIn);
        setCheckOutTime(data.data().checkOut || null);
      }
    } catch (error) {
      reportFatalError("checkTodayAttendance", error);
      Alert.alert("Error", "Gagal mengambil data absensi");
    }
  }, [today, user, reportFatalError]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/Auth-screen/Login");
    }
    if (user) {
      checkTodayAttendance();
    }
  }, [user, loading, checkTodayAttendance, router]);

  const handleCheckIn = useCallback(async () => {
    if (!user) return;

    try {
      const time = new Date().toLocaleTimeString();

      const docRef = await addDoc(collection(db, "attendance"), {
        userId: user.uid,
        email: user.email,
        checkIn: time,
        checkOut: null,
        date: today,
        createdAt: serverTimestamp(),
      });

      setCheckInTime(time);
      setDocId(docRef.id);
      Alert.alert("Berhasil", "Absen masuk berhasil");
    } catch (error) {
      reportFatalError("handleCheckIn", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Terjadi kesalahan"
      );
    }
  }, [today, user, reportFatalError]);

  const handleCheckOut = useCallback(async () => {
    if (!user || !docId) return;

    try {
      const time = new Date().toLocaleTimeString();

      await updateDoc(doc(db, "attendance", docId), {
        checkOut: time,
      });

      setCheckOutTime(time);
      Alert.alert("Berhasil", "Absen pulang berhasil");
    } catch (error) {
      reportFatalError("handleCheckOut", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Terjadi kesalahan"
      );
    }
  }, [docId, user, reportFatalError]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/Auth-screen/Login");
    } catch {
      reportFatalError("handleLogout", "Gagal logout");
      Alert.alert("Error", "Gagal logout");
    }
  }, [logout, router, reportFatalError]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Sistem Absensi</Text>
            <Text style={styles.subtitle}>{today}</Text>
          </View>

          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Card Absensi */}
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{userEmail}</Text>

        {fatalError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Aplikasi dinonaktifkan karena error: {fatalError}
            </Text>
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={resetError}
            >
              <Text style={styles.resetButtonText}>Reset Error</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Masuk</Text>
            <Text style={styles.time}>
              {checkInTime || "-- : --"}
            </Text>
          </View>

          <View>
            <Text style={styles.label}>Pulang</Text>
            <Text style={styles.time}>
              {checkOutTime || "-- : --"}
            </Text>
          </View>
        </View>
      </View>

      {/* Tombol */}
      <View style={styles.buttonContainer}>
        <ActionButton
          title="ABSEN MASUK"
          disabled={!!checkInTime || !!fatalError}
          onPress={handleCheckIn}
        />

        <ActionButton
          title="ABSEN PULANG"
          disabled={!checkInTime || !!checkOutTime || !!fatalError}
          onPress={handleCheckOut}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginTop: 30,
    marginBottom: 30,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1E293B",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  label: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 10,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
  },
  errorBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
  },
  resetButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#DC2626",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  time: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0F172A",
  },
  buttonContainer: {
    marginTop: 40,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: "#94A3B8",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
