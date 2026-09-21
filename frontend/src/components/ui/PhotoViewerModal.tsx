/**
 * P1: the full-screen photo viewer. Swipe moves between the photos of one
 * record (a plain paging FlatList — no gesture library needed for that);
 * pinch zooms the current photo. Pinch uses react-native-gesture-handler's
 * legacy `PinchGestureHandler` + React Native's own `Animated` — NOT
 * react-native-reanimated's worklet API, which needs a babel plugin this
 * app doesn't have configured. That keeps this OTA-safe: no native module,
 * no build config change.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
} from 'react-native';
import {
    GestureHandlerRootView,
    PinchGestureHandler,
    State,
    type PinchGestureHandlerGestureEvent,
    type PinchGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { RemoteImage } from './PhotoStrip';
import { farmPhotoPath, photosApi, type PhotoInfo } from '../../api/photos';
import { feedbackApi } from '../../api/feedback';
import { sharePhoto } from '../../features/photoBackup';
import { useSavePhotos } from '../photos/useSavePhotos';
import { formatDate } from '../../utils/formatDate';

const c = theme.roles.light;
const MAX_ZOOM = 4;

const ZoomableImage: React.FC<{ uri: string }> = ({ uri }) => {
    const baseScale = useRef(new Animated.Value(1)).current;
    const pinchScale = useRef(new Animated.Value(1)).current;
    const scale = Animated.multiply(baseScale, pinchScale);
    const lastScale = useRef(1);

    const onGestureEvent = Animated.event([{ nativeEvent: { scale: pinchScale } }], {
        useNativeDriver: true,
    });
    const onHandlerStateChange = (event: PinchGestureHandlerStateChangeEvent) => {
        if (event.nativeEvent.oldState === State.ACTIVE) {
            lastScale.current = Math.min(Math.max(lastScale.current * event.nativeEvent.scale, 1), MAX_ZOOM);
            baseScale.setValue(lastScale.current);
            pinchScale.setValue(1);
        }
    };

    return (
        <PinchGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
            <Animated.View style={styles.page}>
                <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
                    <RemoteImage uri={uri} contentFit="contain" style={styles.fullImage} testID="photo-viewer-image" />
                </Animated.View>
            </Animated.View>
        </PinchGestureHandler>
    );
};

interface Props {
    /** Full-size signed URLs of every photo in this record, in order. */
    photos: string[];
    /** Index in `photos` to open on. */
    initialIndex: number;
    onClose: () => void;
}

/**
 * Per-photo facts from the server for farm photos (F3 small copy, F4 its
 * record, F7.8 who uploaded it). Offline or not a farm photo → none of the
 * extras show; the photo itself always does.
 */
function usePhotoInfo(photos: string[]) {
    const [info, setInfo] = useState<Map<string, PhotoInfo>>(new Map());
    const key = photos.join('|');
    useEffect(() => {
        const paths = [...new Set(photos.map(farmPhotoPath).filter((p): p is string => !!p))];
        if (!paths.length) return;
        let live = true;
        photosApi
            .info(paths)
            .then(({ data }) => live && setInfo(new Map(data.map((d) => [d.path, d]))))
            .catch(() => undefined);
        return () => {
            live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return info;
}

export const PhotoViewerModal: React.FC<Props> = ({ photos, initialIndex, onClose }) => {
    const { t } = useTranslation();
    const [index, setIndex] = useState(initialIndex);
    const [note, setNote] = useState<string | null>(null);
    const [sharing, setSharing] = useState(false);
    const width = Dimensions.get('window').width;
    const info = usePhotoInfo(photos);
    const { save, progress } = useSavePhotos((message) => setNote(message));

    const path = farmPhotoPath(photos[index] ?? '');
    const current = path ? info.get(path) : undefined;
    const recordId = [...info.values()].find((i) => i.recordId)?.recordId ?? null;

    const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / width);
        setIndex(Math.min(Math.max(i, 0), photos.length - 1));
    };

    // F4.1: this photo, full size (or its small copy) → the share sheet.
    const share = async () => {
        setSharing(true);
        setNote(null);
        try {
            await sharePhoto(photos[index]);
        } catch {
            setNote(t('storage.backup.failed'));
        } finally {
            setSharing(false);
        }
    };

    // F7.8: routed into the feedback inbox with the path attached, never copied.
    const report = () =>
        Alert.alert(t('storage.report.title'), t('storage.report.body'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('storage.report.confirm'),
                style: 'destructive',
                onPress: () =>
                    feedbackApi
                        .reportPhoto(path!)
                        .then(() => setNote(t('storage.report.sent')))
                        .catch(() => setNote(t('storage.report.failed'))),
            },
        ]);

    const busy = sharing || !!progress;

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <GestureHandlerRootView style={styles.backdrop}>
                <Animated.FlatList
                    testID="photo-viewer"
                    data={photos}
                    horizontal
                    pagingEnabled
                    initialScrollIndex={initialIndex}
                    getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
                    keyExtractor={(uri, i) => `${uri}-${i}`}
                    onMomentumScrollEnd={onMomentumScrollEnd}
                    renderItem={({ item }) => <ZoomableImage uri={item} />}
                />
                <Pressable
                    style={styles.closeBtn}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                >
                    <MaterialCommunityIcons name="close" size={28} color="#fff" />
                </Pressable>
                {photos.length > 1 && (
                    <View style={styles.counter} pointerEvents="none">
                        <Text style={styles.counterText}>{t('common.photoCount', { current: index + 1, total: photos.length })}</Text>
                    </View>
                )}
                <View style={styles.footer}>
                    {current?.fullDroppedAt && (
                        <Text style={styles.caption} testID="photo-viewer-small-copy">
                            {t('storage.smallCopy', {
                                date: formatDate(current.fullDroppedAt, { day: 'numeric', month: 'short', year: 'numeric' }),
                            })}
                        </Text>
                    )}
                    {(progress || note) && <Text style={styles.caption}>{progress ?? note}</Text>}
                    <View style={styles.actions}>
                        <Pressable
                            style={styles.action}
                            onPress={share}
                            disabled={busy}
                            accessibilityRole="button"
                            accessibilityLabel={t('storage.backup.shareOne')}
                        >
                            {sharing ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="share-variant" size={22} color="#fff" />}
                            <Text style={styles.actionText}>{t('storage.backup.shareOne')}</Text>
                        </Pressable>
                        {recordId && photos.length > 1 && (
                            <Pressable
                                style={styles.action}
                                onPress={() => void save({ recordId })}
                                disabled={busy}
                                accessibilityRole="button"
                                accessibilityLabel={t('storage.backup.saveThese')}
                            >
                                {progress ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="folder-zip-outline" size={22} color="#fff" />}
                                <Text style={styles.actionText}>{t('storage.backup.saveThese')}</Text>
                            </Pressable>
                        )}
                        {current && !current.uploadedByMe && (
                            <Pressable
                                style={styles.action}
                                onPress={report}
                                accessibilityRole="button"
                                accessibilityLabel={t('storage.report.action')}
                            >
                                <MaterialCommunityIcons name="flag-outline" size={22} color="#fff" />
                                <Text style={styles.actionText}>{t('storage.report.action')}</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
    page: { width: Dimensions.get('window').width, flex: 1, justifyContent: 'center' },
    fullImage: { width: '100%', height: '100%' },
    closeBtn: { position: 'absolute', top: theme.spacing[8], right: theme.spacing[4], padding: theme.spacing[2] },
    counter: {
        position: 'absolute',
        top: theme.spacing[8],
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.full,
    },
    counterText: { color: '#fff', ...theme.typeScale.labelMedium },
    footer: {
        position: 'absolute',
        bottom: theme.spacing[8],
        left: theme.spacing[4],
        right: theme.spacing[4],
        alignItems: 'center',
        gap: theme.spacing[2],
    },
    caption: {
        color: '#fff',
        ...theme.typeScale.bodySmall,
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.md,
    },
    actions: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing[6] },
    action: { alignItems: 'center', minWidth: 64, minHeight: 44, justifyContent: 'center', gap: 2 },
    actionText: { color: '#fff', ...theme.typeScale.labelSmall },
});
