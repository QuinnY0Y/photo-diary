import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { formatCapturedTime } from '../domain/diaryTime';
import type { PhotoEntry } from '../domain/types';

export function FullscreenViewer({
  photos,
  initialId,
  visible,
  onClose,
}: {
  photos: PhotoEntry[];
  initialId: string | null;
  visible: boolean;
  onClose(): void;
}) {
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<PhotoEntry>>(null);
  const index = Math.max(0, photos.findIndex((photo) => photo.id === initialId));

  useEffect(() => {
    if (!visible) return;
    requestAnimationFrame(() => list.current?.scrollToIndex({ index, animated: false }));
  }, [index, visible]);

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable onPress={onClose} style={styles.close} accessibilityLabel="关闭照片浏览">
          <Ionicons name="close" color="#FFFFFF" size={28} />
        </Pressable>
        <Text style={styles.count}>{photos.length > 1 ? `${index + 1} / ${photos.length}` : ''}</Text>
        <FlatList
          ref={list}
          data={photos}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
          initialScrollIndex={index}
          onScrollToIndexFailed={() => undefined}
          renderItem={({ item }) => (
            <View style={[styles.page, { width }]}>
              <Image source={{ uri: item.uri }} style={styles.image} resizeMode="contain" />
              <View style={styles.caption}>
                <Text style={styles.time}>{formatCapturedTime(item.capturedAt)}{item.isBackfill ? ' · 补录' : ''}</Text>
                {item.location?.label ? <Text style={styles.location}>{item.location.label}</Text> : null}
                {item.memo ? <Text style={styles.memo}>{item.memo}</Text> : null}
              </View>
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#151311' },
  close: { position: 'absolute', zIndex: 3, left: 16, top: 42, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', zIndex: 3, top: 54, alignSelf: 'center', color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  page: { flex: 1, justifyContent: 'center' },
  image: { width: '100%', height: '68%' },
  caption: { paddingHorizontal: 28, paddingTop: 18, minHeight: 150 },
  time: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '700' },
  location: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 4 },
  memo: { color: '#FFFFFF', fontSize: 16, lineHeight: 24, marginTop: 14 },
});
