import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { colors } from './theme';

function Bone({ style }: { style: object }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.82, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return <Animated.View style={[styles.bone, style, { opacity }]} />;
}

export function TimelineSkeleton() {
  return (
    <View style={styles.list} accessibilityLabel="正在加载时间轴">
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} style={styles.row}>
          <Bone style={styles.time} />
          <View style={styles.dot} />
          <Bone style={styles.card} />
        </View>
      ))}
    </View>
  );
}

export function DaySkeleton() {
  return (
    <View style={styles.grid} accessibilityLabel="正在加载日视图">
      {Array.from({ length: 20 }, (_, index) => (
        <Bone key={index} style={styles.cell} />
      ))}
    </View>
  );
}

export function TagSkeleton() {
  return (
    <View style={styles.list} accessibilityLabel="正在加载 Tag">
      <View style={styles.tagRow}>
        <Bone style={styles.tag} />
        <Bone style={styles.tag} />
        <Bone style={styles.tag} />
      </View>
      <View style={styles.photoGrid}>
        <Bone style={styles.photo} />
        <Bone style={styles.photo} />
        <Bone style={styles.photo} />
        <Bone style={styles.photo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bone: { backgroundColor: '#E8E0D6', borderRadius: 10 },
  list: { padding: 20, gap: 18 },
  row: { minHeight: 156, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  time: { width: 42, height: 14, marginTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line, marginTop: 7 },
  card: { flex: 1, height: 144 },
  grid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '23%', aspectRatio: 0.82 },
  tagRow: { flexDirection: 'row', gap: 8 },
  tag: { width: 84, height: 36, borderRadius: 18 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: '47%', aspectRatio: 0.85 },
});
