/**
 * A person's picture, or their initials in a coloured circle.
 *
 * `uri` is whatever the server chose to send for this viewer (thumbnail on
 * lists): null when the person has no picture OR has hidden it from their
 * team — the server decides, this only draws. Disk-cached under the URL minus
 * its signature (photoCacheKey), so an hourly re-sign still hits the cache,
 * and a replaced picture (new object path) never shows the old bytes.
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { File } from 'expo-file-system';
import { theme } from '../../theme';
import { RemoteImage, photoCacheKey } from './PhotoStrip';

const c = theme.roles.light;
const TONES = [
    { bg: c.infoBg, fg: c.infoText },
    { bg: c.successBg, fg: c.successText },
    { bg: c.warningBg, fg: c.warningText },
    { bg: c.dangerBg, fg: c.dangerText },
    { bg: c.surfaceVariant, fg: c.textPrimary },
];

/** Same person, same colour, on every screen. */
export const toneFor = (seed: string) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return TONES[Math.abs(h) % TONES.length];
};

interface Props {
    uri?: string | null;
    /** Initials shown when there is no picture. */
    initials: string;
    /** Stable per person (user id) — picks the circle's colour. */
    seed: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export const Avatar: React.FC<Props> = ({ uri, initials, seed, size = 40, style, testID }) => {
    const box = { width: size, height: size, borderRadius: size / 2 };
    if (uri) {
        return (
            <View style={[box, styles.clip, style]}>
                <RemoteImage uri={uri} style={box} contentFit="cover" testID={testID} />
            </View>
        );
    }
    const tone = toneFor(seed);
    return (
        <View style={[box, styles.center, { backgroundColor: tone.bg }, style]} testID={testID ? `${testID}-initials` : undefined}>
            <Text style={[styles.initials, { color: tone.fg, fontSize: Math.round(size * 0.38) }]} maxFontSizeMultiplier={1.2}>
                {initials}
            </Text>
        </View>
    );
};

/**
 * Drop a removed picture's bytes from the disk cache. expo-image has no
 * per-key delete (clearDiskCache would wipe every photo), so delete the one
 * cached file behind the stable key. Best effort: the key is gone from the
 * UI either way.
 */
export async function evictCachedImage(url: string | null | undefined): Promise<void> {
    if (!url) return;
    try {
        const path = await Image.getCachePathAsync(photoCacheKey(url));
        if (!path) return;
        const file = new File(path.startsWith('file://') ? path : `file://${path}`);
        if (file.exists) file.delete();
    } catch {
        // Nothing cached, or the cache moved: nothing to evict.
    }
}

const styles = StyleSheet.create({
    clip: { overflow: 'hidden', backgroundColor: c.surfaceVariant },
    center: { alignItems: 'center', justifyContent: 'center' },
    initials: { fontWeight: '600' },
});
