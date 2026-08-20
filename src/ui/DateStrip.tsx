import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { parseDateKey, toDateKey, weekAround } from '../domain/diaryTime';
import { colors } from './theme';

export function DateStrip({ selected, onSelect }: { selected: string; onSelect(value: string): void }) {
  const today = toDateKey(new Date());
  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityLabel="日期选择"
    >
      {weekAround(selected).map((key) => {
        const date = parseDateKey(key);
        const active = key === selected;
        const isToday = key === today;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            style={({ pressed }) => [styles.item, active && styles.active, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${date.getMonth() + 1}月${date.getDate()}日${isToday ? '，今天' : ''}`}
          >
            <Text style={[styles.weekday, active && styles.activeText]}>
              {isToday ? '今' : ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
            </Text>
            <Text style={[styles.day, active && styles.activeText]}>{date.getDate()}</Text>
            {isToday && !active ? <View style={styles.todayDot} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0, height: 76, minHeight: 76, maxHeight: 76 },
  content: { paddingHorizontal: 16, paddingBottom: 12, gap: 7 },
  item: {
    width: 43,
    minHeight: 62,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  active: { backgroundColor: colors.ink },
  pressed: { opacity: 0.74 },
  weekday: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  day: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  activeText: { color: colors.paper },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.coral },
});
