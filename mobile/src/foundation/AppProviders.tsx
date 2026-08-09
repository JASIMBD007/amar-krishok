import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono/500Medium";
import { JetBrainsMono_600SemiBold } from "@expo-google-fonts/jetbrains-mono/600SemiBold";
import { NotoSansBengali_400Regular } from "@expo-google-fonts/noto-sans-bengali/400Regular";
import { NotoSansBengali_600SemiBold } from "@expo-google-fonts/noto-sans-bengali/600SemiBold";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useState, type PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import "../i18n/config";
import { SessionProvider } from "../auth/SessionProvider";
import { ThemeProvider, colors } from "../theme";
import { subscribeProofQueue } from "../offline/proofQueue";
import { LocaleSettingsProvider } from "../i18n/LocaleSettingsProvider";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());
  const [areFontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    NotoSansBengali_400Regular,
    NotoSansBengali_600SemiBold,
  });

  useEffect(() => subscribeProofQueue(), []);

  if (fontError) throw fontError;
  if (!areFontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LocaleSettingsProvider><SessionProvider>{children}</SessionProvider></LocaleSettingsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: colors.background.page,
    flex: 1,
    justifyContent: "center",
  },
});
