import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { HeroCard, DO_FIRST_BG, DO_FIRST_ON } from './HeroCard';
import { MoltInlineAction, type MoltInlineActionProps } from '../molt/MoltInlineAction';
import { theme } from '../../theme';
import type { BriefingItem, AlertSeverity } from '../../api/alertCenter';

/**
 * "Do this first" — the single most urgent thing across every farm, stated as
 * one action.
 *
 * This is the centrepiece of the redesign (artboard 1b). Home previously opened
 * on a list of alerts, which asks the farmer to untangle severity, pond and
 * farm before they can act. The design's answer is to do that ranking for them
 * and put ONE action at the top, with the rest demoted to a "Then" list.
 *
 * ONE ACTION IS NOT ONE POND. The engine raises the same finding per pond —
 * five ponds drifting on ammonia are five items with the identical title — and
 * the card used to take the first and name it, so a farm-wide problem was
 * reported as one arbitrary pond in one arbitrary farm. A farmer who fixed that
 * pond had fixed a fifth of the problem and been told they were done.
 *
 * So identical findings are grouped, and the card says how much ground the
 * action covers: which farm when it is one, how many farms when it is several,
 * and how many ponds either way.
 *
 * The card itself is HeroCard, shared with the first-run setup step that fills
 * the same slot before there is anything to raise an alert about.
 */

/** Re-exported: several screens colour against the hero's palette. */
export { DO_FIRST_BG, DO_FIRST_ON };

/** Rank order: a critical anywhere outranks a watch anywhere. */
const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 3, watch: 2, info: 1 };

/** The same finding, everywhere it applies. */
export interface ActionGroup {
    /** Stable identity of the finding itself, independent of pond. */
    key: string;
    severity: AlertSeverity;
    title: string;
    /** The engine's plain-language reason, from the worst member. */
    why?: string;
    /** Every alert in the group — what "done" and "later" apply to. */
    items: BriefingItem[];
    /** Distinct ponds affected. */
    pondIds: string[];
}

/** Most severe first; ties broken by how many alerts back it. */
export const rankActions = (items: BriefingItem[]): BriefingItem[] =>
    [...items].sort(
        (a, b) =>
            SEVERITY_RANK[b.topSeverity] - SEVERITY_RANK[a.topSeverity] ||
            b.alertCount - a.alertCount,
    );

/**
 * Collapse identical findings across ponds into one action.
 *
 * Keyed on source + title + severity: that is what makes two alerts the SAME
 * thing to do. Deliberately not keyed on the reason text — "Free NH₃ 0.34
 * mg/L" differs per pond while the action does not, and keying on it would
 * un-group the very case this exists for.
 */
/**
 * Lunar titles carry a per-pond count ("Post-molt — 5 actions pending"), so
 * keying on the whole title split one farm-wide molt window into a hero per
 * pond. The phase part before the dash is the finding.
 */
const lunarPhase = (title: string) => title.split('—')[0].trim();

export const groupActions = (items: BriefingItem[]): ActionGroup[] => {
    const groups = new Map<string, ActionGroup>();
    for (const item of rankActions(items)) {
        const key =
            item.source === 'lunar'
                ? `lunar:${lunarPhase(item.topTitle)}:${item.topSeverity}`
                : `${item.source}:${item.topTitle}:${item.topSeverity}`;
        const existing = groups.get(key);
        if (!existing) {
            groups.set(key, {
                key,
                severity: item.topSeverity,
                title: item.topTitle,
                // rankActions put the worst first, so the first member's reason
                // is the one worth showing.
                why: item.steps?.[0],
                items: [item],
                pondIds: item.pondId ? [item.pondId] : [],
            });
            continue;
        }
        existing.items.push(item);
        if (item.pondId && !existing.pondIds.includes(item.pondId)) {
            existing.pondIds.push(item.pondId);
        }
        // Several ponds' counts differ; the headline states the phase only.
        if (item.source === 'lunar') existing.title = lunarPhase(item.topTitle);
    }
    return Array.from(groups.values()).sort(
        (a, b) =>
            SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
            b.pondIds.length - a.pondIds.length,
    );
};

export interface NextActionCardProps {
    /** Alerts across every farm the user can see, unranked. */
    items: BriefingItem[];
    /** Resolve a pond id to its farm's name — each item carries its farm. */
    farmNameForPond?: (pondId: string | null) => string | undefined;
    /** Primary action: the farmer says they have done it, for the whole group. */
    onDone: (group: ActionGroup) => void;
    /** Secondary: not now. The card then shows the next finding. */
    onLater: (group: ActionGroup) => void;
    /** A lunar item's single auto step: open its log. */
    onLog?: MoltInlineActionProps['onLog'];
    cropIdForPond?: MoltInlineActionProps['cropIdForPond'];
}

export const NextActionCard: React.FC<NextActionCardProps> = ({
    items,
    farmNameForPond,
    onDone,
    onLater,
    onLog,
    cropIdForPond,
}) => {
    const { t } = useTranslation();
    const groups = groupActions(items);
    const group = groups[0];

    // Nothing urgent is a RESULT, not an empty state — the caller decides
    // whether to render a calm "all clear" or a setup step instead.
    if (!group) return null;

    // How much ground this action covers. One pond in one farm reads exactly as
    // it did; anything wider says so rather than picking a representative.
    const farmNames = Array.from(
        new Set(group.pondIds.map((id) => farmNameForPond?.(id)).filter(Boolean) as string[]),
    );
    const pondCount = group.pondIds.length;
    const scope = [
        farmNames.length === 1
            ? farmNames[0]
            : farmNames.length > 1
                ? t('home.acrossFarms', { pl: farmNames.length })
                : null,
        pondCount > 1 ? t('home.acrossPonds', { pl: pondCount }) : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <HeroCard
            eyebrow={t('home.doThisFirst')}
            counter={groups.length > 1 ? t('home.oneOfN', { n: groups.length }) : null}
            farm={scope || null}
            headline={group.title}
            why={group.why}
            primaryLabel={t('home.markDone')}
            onPrimary={() => onDone(group)}
            secondaryLabel={t('home.later')}
            onSecondary={() => onLater(group)}
            extra={
                // One pond only: ticking a step on ponds nobody looked at is not "done".
                group.items.length === 1 ? (
                    <MoltInlineAction
                        item={group.items[0]}
                        onLog={onLog}
                        cropIdForPond={cropIdForPond}
                        style={styles.inlineBtn}
                        labelStyle={styles.inlineLabel}
                    />
                ) : null
            }
        />
    );
};

const styles = StyleSheet.create({
    inlineBtn: {
        alignSelf: 'flex-start',
        borderWidth: 1.5,
        borderColor: DO_FIRST_ON,
        borderRadius: theme.radius.sm,
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        minHeight: 44,
        justifyContent: 'center',
    },
    inlineLabel: { ...theme.typeScale.bodyLarge, color: DO_FIRST_ON, fontWeight: '700' },
});

export default NextActionCard;
