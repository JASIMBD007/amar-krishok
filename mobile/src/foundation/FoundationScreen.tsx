import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { defaultLocaleSettings } from "../i18n";
import { useTheme, type AppTheme } from "../theme";

export function FoundationScreen() {
  const { t } = useTranslation();
  const appTheme = useTheme();
  const screenStyles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <SafeAreaView style={screenStyles.safeArea}>
      <StatusBar style="dark" />
      <View style={screenStyles.screen}>
        <View style={screenStyles.brandRow}>
          <View style={screenStyles.brandMark}>
            <Text style={screenStyles.brandGlyph}>অ</Text>
          </View>
          <Text style={screenStyles.brandName}>{t("common.appName")}</Text>
        </View>

        <View style={screenStyles.content}>
          <Text style={screenStyles.eyebrow}>{t("foundation.eyebrow")}</Text>
          <Text style={screenStyles.title}>{t("foundation.title")}</Text>
          {defaultLocaleSettings.showEnglishGloss ? (
            <Text style={screenStyles.gloss}>{t("foundation.titleGloss", { lng: "en" })}</Text>
          ) : null}
          <Text style={screenStyles.body}>{t("foundation.body")}</Text>

          <View style={screenStyles.card}>
            <View style={screenStyles.statusPill}>
              <Text style={screenStyles.statusText}>{t("foundation.status")}</Text>
            </View>
            {["foundation.locale", "foundation.timeZone", "foundation.api"].map((key) => (
              <View key={key} style={screenStyles.detailRow}>
                <View style={screenStyles.dot} />
                <Text style={screenStyles.detailText}>{t(key)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: appTheme.colors.background.page,
      flex: 1,
    },
    screen: {
      flex: 1,
      paddingHorizontal: appTheme.spacing.x6,
      paddingVertical: appTheme.spacing.x6,
    },
    brandRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: appTheme.spacing.x3,
    },
    brandMark: {
      alignItems: "center",
      backgroundColor: appTheme.colors.brand.primary,
      borderRadius: appTheme.radii.modal,
      height: appTheme.spacing.x12,
      justifyContent: "center",
      width: appTheme.spacing.x12,
    },
    brandGlyph: {
      color: appTheme.colors.background.surface,
      fontFamily: appTheme.fontFamilies.bengali.semibold,
      fontSize: appTheme.fontSizes.headingSmall,
    },
    brandName: {
      color: appTheme.colors.text.primary,
      fontFamily: appTheme.fontFamilies.bengali.semibold,
      fontSize: appTheme.fontSizes.headingSmall,
    },
    content: {
      flex: 1,
      justifyContent: "center",
    },
    eyebrow: {
      color: appTheme.colors.brand.deepText,
      fontFamily: appTheme.fontFamilies.ui.bold,
      fontSize: appTheme.fontSizes.eyebrow,
      marginBottom: appTheme.spacing.x2,
    },
    title: {
      color: appTheme.colors.text.primary,
      fontFamily: appTheme.fontFamilies.bengali.semibold,
      fontSize: appTheme.fontSizes.headingSmall,
    },
    gloss: {
      color: appTheme.colors.text.muted,
      fontFamily: appTheme.fontFamilies.ui.regular,
      fontSize: appTheme.fontSizes.eyebrow,
      marginTop: appTheme.spacing.x1,
    },
    body: {
      color: appTheme.colors.text.body,
      fontFamily: appTheme.fontFamilies.bengali.regular,
      fontSize: appTheme.fontSizes.bodyLarge,
      marginTop: appTheme.spacing.x3,
    },
    card: {
      backgroundColor: appTheme.colors.background.surface,
      borderColor: appTheme.colors.border.default,
      borderRadius: appTheme.radii.card,
      borderWidth: 1,
      gap: appTheme.spacing.x2,
      marginTop: appTheme.spacing.x6,
      padding: appTheme.spacing.x4,
    },
    statusPill: {
      alignSelf: "flex-start",
      backgroundColor: appTheme.colors.brand.soft,
      borderRadius: appTheme.radii.pill,
      paddingHorizontal: appTheme.spacing.x3,
      paddingVertical: appTheme.spacing.x2,
    },
    statusText: {
      color: appTheme.colors.brand.deepText,
      fontFamily: appTheme.fontFamilies.bengali.semibold,
      fontSize: appTheme.fontSizes.metaLarge,
    },
    detailRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: appTheme.spacing.x2,
      minHeight: appTheme.touchTargets.minimum,
    },
    dot: {
      backgroundColor: appTheme.colors.status.good,
      borderRadius: appTheme.radii.pill,
      height: appTheme.spacing.x2,
      width: appTheme.spacing.x2,
    },
    detailText: {
      color: appTheme.colors.text.strong,
      fontFamily: appTheme.fontFamilies.bengali.regular,
      fontSize: appTheme.fontSizes.body,
    },
  });
}
