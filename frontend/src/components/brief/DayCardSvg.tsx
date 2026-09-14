/**
 * The shareable day card (1080×1350 PNG) and its invisible host.
 *
 * `DayCardSvg` only draws a pre-laid-out `DayCardModel` (text already wrapped
 * and translated in features/export/dayReport.ts). `DayCardRenderer` is mounted
 * once by the screen; `shareDayCardImage` asks it to draw a model and gets the
 * <Svg> ref back for `toDataURL`.
 */
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Line, Rect, Text } from 'react-native-svg';

import { CARD_H, CARD_W, registerDayCardHost, type DayCardModel } from '../../features/export/dayReport';
import type { SvgRef } from '../../utils/shareQrImage';

const INK = '#1A222B';
const MUTED = '#5C6F7E';
const BRAND = '#0B6DC7';

export const DayCardSvg = forwardRef<Svg, { model: DayCardModel; width?: number; height?: number }>(
    ({ model: m, width = CARD_W / 10, height = CARD_H / 10 }, ref) => {
        const noteY = m.hasScore ? 560 : 520;
        return (
            <Svg ref={ref} width={width} height={height} viewBox={`0 0 ${CARD_W} ${CARD_H}`}>
                <Rect x={0} y={0} width={CARD_W} height={CARD_H} fill="#FFFFFF" />
                <Rect x={0} y={0} width={CARD_W} height={150} fill={BRAND} />
                <Text x={64} y={98} fontSize={56} fontWeight="bold" fill="#FFFFFF">{m.appName}</Text>
                <Text x={1016} y={96} fontSize={38} fill="#FFFFFF" textAnchor="end">{m.date}</Text>

                <Text x={64} y={250} fontSize={56} fontWeight="bold" fill={INK}>{m.farm}</Text>

                <Rect x={64} y={300} width={952} height={360} rx={28} fill={m.colors.bg} stroke={m.colors.border} strokeWidth={6} />
                {m.hasScore ? (
                    <G>
                        <Text x={110} y={520} fontSize={220} fontWeight="bold" fill={m.colors.text}>{m.score}</Text>
                        <Text x={560} y={440} fontSize={44} fill={MUTED}>/100</Text>
                        <Text x={560} y={510} fontSize={60} fontWeight="bold" fill={m.colors.text}>{m.band}</Text>
                    </G>
                ) : (
                    <Text x={110} y={430} fontSize={88} fontWeight="bold" fill={m.colors.text}>{m.score}</Text>
                )}
                {m.scoreNote.map((line, i) => (
                    <Text key={`n${i}`} x={110} y={noteY + i * 46} fontSize={36} fill={INK}>{line}</Text>
                ))}

                {m.verdict.map((line, i) => (
                    <Text key={`v${i}`} x={64} y={740 + i * 64} fontSize={48} fontWeight="bold" fill={INK}>{line}</Text>
                ))}

                <Line x1={64} y1={950} x2={1016} y2={950} stroke="#E0E8EC" strokeWidth={3} />
                {m.numbers.map((n, i) => {
                    const x = 64 + (i % 2) * 492;
                    const y = 1010 + Math.floor(i / 2) * 130;
                    return (
                        <G key={`k${i}`}>
                            <Text x={x} y={y} fontSize={34} fill={MUTED}>{n.label}</Text>
                            <Text x={x} y={y + 70} fontSize={64} fontWeight="bold" fill={INK}>{n.value}</Text>
                        </G>
                    );
                })}

                {m.weakest.map((line, i) => (
                    <Text key={`w${i}`} x={64} y={1290 + i * 44} fontSize={40} fill={INK}>{line}</Text>
                ))}
            </Svg>
        );
    },
);
DayCardSvg.displayName = 'DayCardSvg';

/**
 * Mount once anywhere in the screen. Draws nothing visible.
 * ponytail: a 1-px-ish, near-transparent view kept inside the window so Android
 * still draws it (toDataURL waits for a first draw); if a device never draws it
 * the share times out and falls back to the PDF.
 */
export const DayCardRenderer: React.FC = () => {
    const svg = useRef<Svg>(null);
    const [model, setModel] = useState<DayCardModel | null>(null);
    const pending = useRef<((ref: SvgRef) => void) | null>(null);

    useEffect(
        () =>
            registerDayCardHost(
                (m) =>
                    new Promise<SvgRef>((resolve) => {
                        pending.current = resolve;
                        setModel(m);
                    }),
            ),
        [],
    );

    useEffect(() => {
        if (!model || !pending.current) return;
        const resolve = pending.current;
        pending.current = null;
        requestAnimationFrame(() => resolve(svg.current as unknown as SvgRef));
    }, [model]);

    if (!model) return null;
    return (
        <View pointerEvents="none" style={styles.host} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <DayCardSvg ref={svg} model={model} />
        </View>
    );
};

const styles = StyleSheet.create({
    host: { position: 'absolute', left: 0, top: 0, width: CARD_W / 10, height: CARD_H / 10, opacity: 0.01, zIndex: -1 },
});

export default DayCardSvg;
