import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text } from "react-native";
import { palette, projectName } from "@tilcai-wallet/config";

export default function Index() {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.name}>{projectName}</Text>
      <Text accessibilityRole="header" style={styles.title}>Tus compras, bajo control.</Text>
      <Text style={styles.text}>Base móvil para sesiones, aprobaciones y recibos.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: palette.background },
  name: { color: palette.violet, fontSize: 16, fontWeight: "600", marginBottom: 16 },
  title: { color: palette.ink, fontSize: 38, fontWeight: "700" },
  text: { color: palette.muted, fontSize: 17, marginTop: 12 },
});
