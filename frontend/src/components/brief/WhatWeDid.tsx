/**
 * "What we did" — people first, then work per pond, then tasks done with who.
 * Visible to everyone on the farm; shift times arrive only for owners/managers
 * (the backend nulls them otherwise). Absent `done` (older backend) ⇒ nothing.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { DailyBrief } from '../../api/dailyBrief';
import { fmtNum, istTime, shiftLine, workLine } from '../../features/dailyBriefText';
import { Section, HIT, c } from './Section';
import { Avatar } from '../ui/Avatar';

const LIMIT = 3;

/** Shows the first 3 rows, then "Show all (n)". */
const Collapsible = <T,>({ items, render, id }: { items: T[]; render: (item: T, i: number) => React.ReactNode; id: string }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    return (
        <>
            {(open ? items : items.slice(0, LIMIT)).map(render)}
            {items.length > LIMIT && (
                <TouchableOpacity onPress={() => setOpen((o) => !o)} hitSlop={HIT} style={styles.more} accessibilityRole="button" testID={`done-more-${id}`}>
                    <Text style={styles.moreText}>{open ? t('dailyBrief.done.showLess') : t('dailyBrief.done.showAll', { count: items.length })}</Text>
                </TouchableOpacity>
            )}
        </>
    );
};

export const WhatWeDid: React.FC<{ brief: DailyBrief; names: Record<string, string> }> = ({ brief, names }) => {
    const { t } = useTranslation();
    const done = brief.done;
    if (!done || (!done.people.length && !done.ponds.length && !done.tasksDone.length)) return null;

    return (
        <Section title={t('dailyBrief.done.title')} testID="brief-done">
            {done.people.length > 0 && <Text style={styles.sub}>{t('dailyBrief.done.people')}</Text>}
            <Collapsible
                id="people"
                items={done.people}
                render={(p) => {
                    const shift = shiftLine(p.shift, t);
                    const work = [workLine(p.counts, p.feedKg, t, p.tasksDone), p.pondIds.length ? t('dailyBrief.done.pondsCount', { count: p.pondIds.length }) : '']
                        .filter(Boolean)
                        .join(' ');
                    return (
                        <View key={p.userId} style={styles.row} testID={`done-person-${p.userId}`}>
                            <Avatar
                                uri={p.avatarThumbUrl}
                                initials={(p.name.trim()[0] ?? '?').toUpperCase()}
                                seed={p.userId}
                                size={32}
                                testID={`done-avatar-${p.userId}`}
                            />
                            <View style={styles.body}>
                                <Text style={styles.main}>
                                    {p.name}
                                    {p.role ? <Text style={styles.role}>{`  ${t(`members.role_${p.role}`)}`}</Text> : null}
                                </Text>
                                {!!work && <Text style={styles.meta}>{work}</Text>}
                                {!!shift && <Text style={styles.meta} testID={`done-shift-${p.userId}`}>{shift}</Text>}
                            </View>
                        </View>
                    );
                }}
            />

            {done.ponds.length > 0 && <Text style={styles.sub}>{t('dailyBrief.done.ponds')}</Text>}
            <Collapsible
                id="ponds"
                items={done.ponds}
                render={(w) => {
                    const { feed: _feed, ...rest } = w.counts;
                    const lines = [
                        workLine(rest, 0, t),
                        w.feedRounds > 0 ? t('dailyBrief.done.feedRounds', { count: w.feedRounds, kg: fmtNum(w.feedKg) }) : '',
                        w.samplingG != null ? t('dailyBrief.done.sampling', { value: fmtNum(w.samplingG) }) : '',
                        w.harvestKg != null ? t('dailyBrief.done.harvest', { value: fmtNum(w.harvestKg) }) : '',
                    ].filter(Boolean);
                    return (
                        <View key={w.pondId} style={styles.row} testID={`done-pond-${w.pondId}`}>
                            <View style={styles.body}>
                                <Text style={styles.main}>{names[w.pondId] ?? ''}</Text>
                                {lines.length > 0 && <Text style={styles.meta}>{lines.join(' · ')}</Text>}
                                {w.people.length > 0 && <Text style={styles.people}>{w.people.join(', ')}</Text>}
                            </View>
                        </View>
                    );
                }}
            />

            {done.tasksDone.length > 0 && <Text style={styles.sub}>{t('dailyBrief.done.tasks')}</Text>}
            <Collapsible
                id="tasks"
                items={done.tasksDone}
                render={(k) => (
                    <View key={k.id} style={styles.row} testID={`done-task-${k.id}`}>
                        <View style={styles.body}>
                            <Text style={styles.main}>
                                {k.title}
                                {k.pondId && names[k.pondId] ? <Text style={styles.role}>{`  ${names[k.pondId]}`}</Text> : null}
                            </Text>
                            <Text style={styles.meta}>
                                {k.completedByName
                                    ? t('dailyBrief.done.doneBy', { name: k.completedByName, time: istTime(k.completedAt) })
                                    : t('dailyBrief.done.doneAt', { time: istTime(k.completedAt) })}
                            </Text>
                        </View>
                    </View>
                )}
            />
        </Section>
    );
};

const styles = StyleSheet.create({
    sub: { ...theme.typeScale.labelMedium, color: c.textTertiary, marginTop: theme.spacing[2], textTransform: 'uppercase' },
    row: { flexDirection: 'row', gap: theme.spacing[3], paddingVertical: theme.spacing[2], alignItems: 'flex-start' },
    body: { flex: 1, minWidth: 0 },
    main: { ...theme.typeScale.bodyMedium, color: c.textPrimary, fontFamily: 'DMSans-SemiBold' },
    role: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    meta: { ...theme.typeScale.bodySmall, color: c.textSecondary, marginTop: 1 },
    people: { ...theme.typeScale.bodySmall, color: c.textTertiary, marginTop: 1 },
    more: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
    moreText: { ...theme.typeScale.labelLarge, color: c.textLink },
});
