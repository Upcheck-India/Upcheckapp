/**
 * Server photos (R2, presigned). The signed URL changes every hour, so the
 * disk cache is keyed on the URL WITHOUT its query string — the object path,
 * which never changes for a given photo (every upload gets a new uuid).
 * Without a stable key the cache would never hit.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp } from 'react-native';
import { Image, type ImageProps, type ImageStyle } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { PhotoViewerModal } from './PhotoViewerModal';

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
    /**
     * P2: when set, each thumbnail gets a small ✕. Index is into `full`
     * (and `thumbs`), same order they were passed in.
     */
    onRemove?: (index: number) => void;
}

/** A row of thumbnails; tapping one opens the zoomable, swipeable viewer. */
export const PhotoStrip: React.FC<Props> = ({ full, thumbs, size = 72, thumbStyle, testID, onRemove }) => {
    const { t } = useTranslation();
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const pairs = photoPairs(full, thumbs);
    return (
        <View style={styles.row}>
            {pairs.map((p, i) => (
                <View key={photoCacheKey(p.full)} style={styles.thumbWrap}>
                    <Pressable
                        onPress={() => setOpenIndex(i)}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={t('common.viewPhoto')}
                    >
                        <RemoteImage
                            uri={p.thumb}
                            style={[styles.thumb, { width: size, height: size }, thumbStyle]}
                            testID={testID}
                        />
                    </Pressable>
                    {onRemove && (
                        <Pressable
                            onPress={() => onRemove(i)}
                            style={styles.removeBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={t('common.removePhoto')}
                        >
                            <MaterialCommunityIcons name="close" size={14} color="#fff" />
                        </Pressable>
                    )}
                </View>
            ))}
            {openIndex !== null && (
                <PhotoViewerModal photos={full} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] },
    thumbWrap: { position: 'relative' },
    thumb: { borderRadius: theme.radius.md, backgroundColor: theme.roles.light.surfaceVariant },
    removeBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: theme.roles.light.dangerText,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
