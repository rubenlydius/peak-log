import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { peaks } from '@/data/peaks';
import { AscentDraft, toDateKey, useAscent, useLogbookStore } from '@/hooks/use-logbook-store';
import { useTheme } from '@/hooks/use-theme';
import { deleteAscentPhoto, saveAscentPhoto } from '@/utils/ascent-photos';

import { DatePicker, Host } from '@expo/ui/swift-ui';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PHOTO_SIZE = 96;

const PhotoGrid = ({
  photoUris,
  onAdd,
  onRemove,
}: {
  photoUris: string[];
  onAdd: () => void;
  onRemove: (uri: string) => void;
}) => {
  const theme = useTheme();

  return (
    <ThemedView style={styles.photoGrid}>
      {photoUris.map((uri) => (
        <Pressable key={uri} onPress={() => onRemove(uri)}>
          <Image source={{ uri }} style={styles.photo} contentFit="cover" />
          <ThemedView type="backgroundElement" style={styles.removeBadge}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              tintColor={theme.text}
              size={12}
            />
          </ThemedView>
        </Pressable>
      ))}

      <Pressable onPress={onAdd}>
        <ThemedView type="backgroundElement" style={[styles.photo, styles.addPhoto]}>
          <SymbolView
            name={{ ios: 'photo.badge.plus', android: 'add_photo_alternate', web: 'add_photo_alternate' }}
            tintColor={theme.textSecondary}
            size={24}
          />
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
};

/** Creates or edits one ascent. Used by both the Mountains and Profile stacks. */
export function AscentForm() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, ascent: ascentId } = useLocalSearchParams<{ id: string; ascent?: string }>();

  const peak = peaks.find((item) => item.id === id);
  const existing = useAscent(ascentId);
  const addAscent = useLogbookStore((state) => state.addAscent);
  const updateAscent = useLogbookStore((state) => state.updateAscent);
  const removeAscent = useLogbookStore((state) => state.removeAscent);

  const [date, setDate] = useState(() => new Date(existing?.date ? `${existing.date}T12:00:00` : Date.now()));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [photoUris, setPhotoUris] = useState<string[]>(existing?.photoUris ?? []);

  const addPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access in Settings to add photos to this climb.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    setPhotoUris([...photoUris, ...result.assets.map((asset) => saveAscentPhoto(asset.uri))]);
  };

  const removePhoto = (uri: string) => {
    setPhotoUris(photoUris.filter((photo) => photo !== uri));
    // Only copies this screen made are deleted; saved entries keep theirs until the entry is saved.
    if (!existing?.photoUris.includes(uri)) deleteAscentPhoto(uri);
  };

  const save = () => {
    if (!peak) return;
    const draft: AscentDraft = { peakId: peak.id, date: toDateKey(date), notes: notes.trim(), photoUris };

    if (existing) {
      // Photos removed while editing are only deleted once the change is kept.
      existing.photoUris.filter((uri) => !photoUris.includes(uri)).forEach(deleteAscentPhoto);
      updateAscent(existing.id, draft);
    } else {
      addAscent(draft);
    }
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete this climb?', 'The notes and photos of this entry are removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          existing.photoUris.forEach(deleteAscentPhoto);
          removeAscent(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: existing ? 'Edit climb' : 'Log a climb',
          headerRight: () => (
            <Pressable onPress={save}>
              <ThemedText type="link">Save</ThemedText>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {peak?.name ?? 'Mountain'}
        </ThemedText>

        <ThemedView style={{ gap: Spacing.two }}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Date
          </ThemedText>
          <Host matchContents seedColor={theme.accent}>
            <DatePicker
              selection={date}
              displayedComponents={['date']}
              onDateChange={(next) => setDate(next)}
            />
          </Host>
        </ThemedView>

        <ThemedView style={{ gap: Spacing.two }}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Notes
          </ThemedText>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Route, weather, who you climbed with…"
            autoCapitalize="none"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.notes, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        </ThemedView>

        <ThemedView style={{ gap: Spacing.two }}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Photos{photoUris.length ? ` (${photoUris.length})` : ''}
          </ThemedText>
          <PhotoGrid photoUris={photoUris} onAdd={addPhotos} onRemove={removePhoto} />
          <ThemedText type="small" themeColor="textSecondary">
            Tap a photo to remove it.
          </ThemedText>
        </ThemedView>

        {!!existing && (
          <Pressable onPress={confirmDelete} style={styles.deleteButton}>
            <ThemedText type="smallBold" style={{ color: '#FF3B30' }}>
              Delete this climb
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  notes: {
    minHeight: 120,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: Spacing.two,
  },
  addPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadge: {
    position: 'absolute',
    top: -Spacing.one,
    right: -Spacing.one,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});
