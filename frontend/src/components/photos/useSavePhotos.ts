/**
 * F4: "Save these photos" for one record, one pond-month or one cycle — the
 * same flow from the viewer, the storage screen and Cycle Result. Fetches the
 * batch (signed URLs + CSV metadata), asks before splitting an over-cap batch
 * by month, then zips and shares each part with a progress line.
 */
import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { photosApi, type BackupItem, type BackupScope } from '../../api/photos';
import { backupFilename, planBackup, shareBackupZip } from '../../features/photoBackup';
import { formatBytes } from '../../features/photoStorage';

type Notify = (message: string, type: 'success' | 'error') => void;

const ask = (title: string, body: string, ok: string, cancel: string) =>
    new Promise<boolean>((resolve) =>
        Alert.alert(title, body, [
            { text: cancel, style: 'cancel', onPress: () => resolve(false) },
            { text: ok, onPress: () => resolve(true) },
        ]),
    );

/** Zip name parts: farm and pond, then the cycle, the month, or the record's date. */
const nameParts = (scope: BackupScope, first: BackupItem) => [
    first.farmName,
    first.pondName,
    'cropId' in scope ? first.cropName : 'month' in scope ? scope.month : first.uploadedAt.slice(0, 10),
];

export function useSavePhotos(notify: Notify) {
    const { t } = useTranslation();
    const [progress, setProgress] = useState<string | null>(null);

    const save = async (scope: BackupScope) => {
        if (progress) return;
        setProgress(t('storage.backup.preparing'));
        try {
            const { data } = await photosApi.backup(scope);
            if (!data.length) {
                notify(t('storage.backup.nothing'), 'error');
                return;
            }
            const parts = planBackup(data);
            if (
                parts.length > 1 &&
                !(await ask(
                    t('storage.backup.splitTitle'),
                    t('storage.backup.splitBody', {
                        photos: t('storage.photoCount', { count: data.length }),
                        bytes: formatBytes(data.reduce((s, i) => s + i.bytes, 0)),
                        parts: parts.length,
                    }),
                    t('storage.backup.splitOk'),
                    t('common.cancel'),
                ))
            ) {
                return;
            }
            let missing = 0;
            for (const [i, part] of parts.entries()) {
                const r = await shareBackupZip(
                    part.items,
                    backupFilename(nameParts(scope, part.items[0]), part.label),
                    (done, total) =>
                        setProgress(
                            parts.length > 1
                                ? t('storage.backup.progressPart', { part: i + 1, parts: parts.length, done, total })
                                : t('storage.backup.progress', { done, total }),
                        ),
                );
                missing += r.missing;
            }
            notify(missing ? t('storage.backup.someMissing', { count: missing }) : t('storage.backup.done'), missing ? 'error' : 'success');
        } catch {
            notify(t('storage.backup.failed'), 'error');
        } finally {
            setProgress(null);
        }
    };

    return { save, progress };
}
