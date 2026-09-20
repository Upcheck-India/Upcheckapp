/**
 * P1: the full-screen photo viewer. Swipe moves between the photos of one
 * record (a plain paging FlatList — no gesture library needed for that);
 * pinch zooms the current photo. Pinch uses react-native-gesture-handler's
 * legacy `PinchGestureHandler` + React Native's own `Animated` — NOT
 * react-native-reanimated's worklet API, which needs a babel plugin this
 * app doesn't have configured. That keeps this OTA-safe: no native module,
 * no build config change.
 */
import React, { useRef, useState } from 'react';
import {
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

export const PhotoViewerModal: React.FC<Props> = ({ photos, initialIndex, onClose }) => {
    const { t } = useTranslation();
    const [index, setIndex] = useState(initialIndex);
    const width = Dimensions.get('window').width;

    const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / width);
        setIndex(Math.min(Math.max(i, 0), photos.length - 1));
    };

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
});
