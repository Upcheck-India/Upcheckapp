/**
 * The one thing a lunar alert asks for, doable from where the alert is shown.
 *
 * A lunar briefing item carries `actions` (one entry per step). When there is
 * exactly one, the card can finish it without a trip to the checklist: a
 * manual step is ticked here ("Done"), an auto step opens its log ("Log it").
 * Anything else (several steps, or an older backend with no `actions`) renders
 * nothing and the caller's own route to the Lunar checklist stands.
 */
import React from 'react';
import { Text, TouchableOpacity, Alert, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { BriefingItem } from '../../api/alertCenter';
import { moltApi } from '../../api/molt';
import { apiErrorMessage } from '../../api/errors';
import { queryClient } from '../../query/client';

export const singleMoltAction = (item: BriefingItem) => {
  const a = item.actions;
  if (item.source !== 'lunar' || a?.items.length !== 1) return null;
  return { pondId: a.pondId, windowKey: a.windowKey, ...a.items[0] };
};

/** Tick a manual molt item, then drop every read it moves. */
export const tickMoltAction = async (pondId: string, windowKey: string, actionKey: string) => {
  await moltApi.setAction(pondId, { windowKey, actionKey, done: true });
  await Promise.all(
    [['briefing'], ['pond', 'molt', pondId], ['briefing', 'molt', 'ponds']].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
};

export interface MoltInlineActionProps {
  item: BriefingItem;
  /** Open an auto item's log screen. Omit to offer ticks only. */
  onLog?: (route: string, params: { pondId: string; cropId?: string }) => void;
  cropIdForPond?: (pondId: string) => string | null | undefined;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export const MoltInlineAction: React.FC<MoltInlineActionProps> = ({ item, onLog, cropIdForPond, style, labelStyle }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);
  const action = singleMoltAction(item);
  if (!action) return null;

  if (action.source === 'manual') {
    const press = async () => {
      setBusy(true);
      try {
        await tickMoltAction(action.pondId, action.windowKey, action.key);
      } catch (e) {
        Alert.alert(t('engines.common.couldNotCompute'), apiErrorMessage(e, t('engines.common.tryAgain')));
      } finally {
        setBusy(false);
      }
    };
    return (
      <TouchableOpacity style={style} onPress={press} disabled={busy} accessibilityRole="button">
        <Text style={labelStyle}>{t('engines.lunar.done')}</Text>
      </TouchableOpacity>
    );
  }

  const cropId = cropIdForPond?.(action.pondId) ?? undefined;
  // A chemical log saved without the cycle never satisfies the item.
  if (!onLog || !action.route || (action.route === 'ChemicalLog' && !cropId)) return null;
  return (
    <TouchableOpacity
      style={style}
      onPress={() => onLog(action.route!, cropId ? { pondId: action.pondId, cropId } : { pondId: action.pondId })}
      accessibilityRole="button"
    >
      <Text style={labelStyle}>{t('engines.lunar.logIt')}</Text>
    </TouchableOpacity>
  );
};
