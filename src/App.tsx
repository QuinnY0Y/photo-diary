import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { diaryDateFor } from './domain/diaryTime';
import { DayScreen } from './screens/DayScreen';
import { TagsScreen } from './screens/TagsScreen';
import { TimelineScreen } from './screens/TimelineScreen';
import { DiaryProvider, useDiary } from './state/DiaryContext';
import { BottomNav } from './ui/BottomNav';
import type { TabKey } from './ui/BottomNav';
import { OnboardingModal } from './ui/OnboardingModal';
import { ProcessingOverlay } from './ui/ProcessingOverlay';
import { SettingsModal } from './ui/SettingsModal';
import { colors, shadow } from './ui/theme';

function AppShell() {
  const { width } = useWindowDimensions();
  const { state, loading, notificationTarget, clearNotificationTarget } = useDiary();
  const [tab, setTab] = useState<TabKey>('timeline');
  const [selectedDate, setSelectedDate] = useState(() => diaryDateFor(new Date(), 4));
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    if (loading) return;
    setSelectedDate((current) => current || diaryDateFor(new Date(), state.config.startHour));
  }, [loading, state.config.startHour]);

  useEffect(() => {
    if (!notificationTarget) return;
    setSelectedDate(notificationTarget.diaryDate);
    setTab('timeline');
    clearNotificationTarget();
  }, [clearNotificationTarget, notificationTarget]);

  return (
    <View style={styles.stage}>
      <SafeAreaView style={[styles.app, width > 900 && styles.desktopFrame, width > 900 && shadow]}>
        <StatusBar style="dark" />
        <NativeStatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.content}>
          {tab === 'timeline' ? (
            <TimelineScreen selectedDate={selectedDate} onDateChange={setSelectedDate} onOpenSettings={() => setSettings(true)} />
          ) : tab === 'day' ? (
            <DayScreen selectedDate={selectedDate} onDateChange={setSelectedDate} />
          ) : (
            <TagsScreen />
          )}
        </View>
        <BottomNav active={tab} onChange={setTab} />
      </SafeAreaView>
      <OnboardingModal visible={!loading && !state.config.onboardingComplete} />
      <SettingsModal visible={settings} onClose={() => setSettings(false)} />
      <ProcessingOverlay />
    </View>
  );
}

export default function App() {
  const [iconsLoaded, setIconsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    Ionicons.loadFont().finally(() => {
      if (active) setIconsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!iconsLoaded) {
    return <View style={styles.fontLoading} />;
  }

  return (
    <DiaryProvider>
      <AppShell />
    </DiaryProvider>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#E9E3DC', alignItems: 'center' },
  app: { flex: 1, width: '100%', maxWidth: 900, backgroundColor: colors.background },
  desktopFrame: { marginVertical: 18, borderRadius: 24, overflow: 'hidden' },
  content: { flex: 1, minHeight: 0 },
  fontLoading: { flex: 1, backgroundColor: colors.background },
});
