/**
 * Server photos (R2, presigned). The signed URL changes every hour, so the
 * disk cache is keyed on the URL WITHOUT its query string — the object path,
 * which never changes for a given photo (every upload gets a new uuid).
 * Without a stable key the cache would never hit.
 */
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp } from 'react-native';
import { Image, type ImageProps, type ImageStyle } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';

/** `https://host/health/f/a.webp?X-Amz-...` → `https://host/health/f/a.webp`. */
export const photoCacheKey = (url: string) => url.split('?')[0];

type RemoteImageProps = Omit<ImageProps, 'source'> & { uri: string };

export const RemoteImage: React.FC<RemoteImageProps> = ({ uri, ...rest }) => (
    <Image
        source={{ uri, cacheKey: photoCacheKey(uri) }}
        cachePolicy="disk"
        accessibilityIgnoresInvertColors
        {...rest}
    />
);

/** Thumbnail for each full URL; the full URL when no thumbnail came back. */
export const photoPairs = (full: string[] = [], thumbs: string[] = []) =>
    full.map((f, i) => ({ full: f, thumb: thumbs[i] || f }));

interface Props {
    /** Full-size signed URLs (shown when a thumbnail is tapped). */
    full: string[];
    /** Thumbnail signed URLs, same order as `full`. */
    thumbs?: string[];
    size?: number;
    thumbStyle?: StyleProp<ImageStyle>;
    testID?: string;
}

/** A row of thumbnails; tapping one shows the full image. */
export const PhotoStrip: React.FC<Props> = ({ full, thumbs, size = 72, thumbStyle, testID }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState<string | null>(null);
    return (
        <View style={styles.row}>
            {photoPairs(full, thumbs).map((p) => (
                <Pressable
                    key={photoCacheKey(p.full)}
                    onPress={() => setOpen(p.full)}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={t('common.viewPhoto')}
                >
                    <RemoteImage
                        uri={p.thumb}
                        style={[styles.thumb, { width: size, height: size }, thumbStyle]}
                        testID={testID}
                    />
                </Pressable>
            ))}
            <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
                <Pressable
                    style={styles.backdrop}
                    onPress={() => setOpen(null)}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                    testID="photo-viewer"
                >
                    {open && <RemoteImage uri={open} contentFit="contain" style={styles.fullImage} testID="photo-viewer-image" />}
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] },
    thumb: { borderRadius: theme.radius.md, backgroundColor: theme.roles.light.surfaceVariant },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
    fullImage: { width: '100%', height: '80%' },
});
