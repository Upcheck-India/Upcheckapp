jest.mock('../../../api/profiles', () => ({
    profilesApi: {
        uploadAvatar: jest.fn(),
        removeAvatar: jest.fn(),
        setAvatarVisibility: jest.fn(),
    },
}));
jest.mock('../../../features/healthPhoto', () => ({ pickAvatarPhoto: jest.fn() }));
jest.mock('expo-file-system', () => {
    const deleted: string[] = [];
    return {
        __deleted: deleted,
        File: jest.fn().mockImplementation((uri: string) => ({
            exists: true,
            delete: () => deleted.push(uri),
        })),
    };
});

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { ProfilePhotoSection } from '../ProfilePhotoSection';
import { profilesApi } from '../../../api/profiles';
import { pickAvatarPhoto } from '../../../features/healthPhoto';
import { useSyncStore } from '../../../store/syncStore';
import { photoCacheKey } from '../../ui/PhotoStrip';

const deleted: string[] = require('expo-file-system').__deleted;

const OLD = {
    avatarUrl: 'https://b.r2/avatars/u1/old.webp?sig=1',
    avatarThumbUrl: 'https://b.r2/avatars/u1/old.thumb.webp?sig=1',
    hasUploadedAvatar: true,
    showAvatarToTeam: true,
};
const NONE = { avatarUrl: null, avatarThumbUrl: null, hasUploadedAvatar: false, showAvatarToTeam: true };
const NEW = {
    ...OLD,
    avatarUrl: 'https://b.r2/avatars/u1/new.webp?sig=2',
    avatarThumbUrl: 'https://b.r2/avatars/u1/new.thumb.webp?sig=2',
};

/** Press the Alert button labelled `label` on the next Alert.alert. */
const pressAlertButton = (label: string) =>
    jest.spyOn(Alert, 'alert').mockImplementationOnce((_t, _m, buttons) => {
        buttons?.find((b) => b.text === label)?.onPress?.();
    });

let cachePath: jest.SpyInstance;
beforeEach(() => {
    jest.clearAllMocks();
    deleted.length = 0;
    useSyncStore.setState({ isConnected: true });
    cachePath = jest
        .spyOn(Image, 'getCachePathAsync')
        .mockImplementation(async (key: string) => `/cache/${encodeURIComponent(key)}`);
});

const renderIt = (avatar = OLD) => {
    const onChange = jest.fn();
    const utils = render(<ProfilePhotoSection avatar={avatar} onChange={onChange} initials="RK" seed="u1" />);
    return { ...utils, onChange };
};

describe('ProfilePhotoSection', () => {
    it('remove: confirms, deletes on the server, clears the picture and evicts its cached bytes', async () => {
        (profilesApi.removeAvatar as jest.Mock).mockResolvedValue({ data: NONE });
        pressAlertButton('Remove photo');
        const { getByTestId, onChange } = renderIt();

        await act(async () => {
            fireEvent.press(getByTestId('avatar-remove'));
        });

        await waitFor(() => expect(profilesApi.removeAvatar).toHaveBeenCalledTimes(1));
        expect(onChange).toHaveBeenCalledWith(NONE);
        // Evicted by the STABLE key (signature stripped), both sizes.
        expect(cachePath).toHaveBeenCalledWith(photoCacheKey(OLD.avatarUrl));
        expect(cachePath).toHaveBeenCalledWith(photoCacheKey(OLD.avatarThumbUrl));
        expect(deleted).toEqual(
            expect.arrayContaining([
                `file:///cache/${encodeURIComponent(photoCacheKey(OLD.avatarUrl))}`,
                `file:///cache/${encodeURIComponent(photoCacheKey(OLD.avatarThumbUrl))}`,
            ]),
        );
    });

    it('remove: nothing happens when the confirm is cancelled', async () => {
        pressAlertButton('Cancel');
        const { getByTestId } = renderIt();
        await act(async () => {
            fireEvent.press(getByTestId('avatar-remove'));
        });
        expect(profilesApi.removeAvatar).not.toHaveBeenCalled();
    });

    it('change: picks with the square crop, uploads, shows the new picture, evicts the old', async () => {
        (pickAvatarPhoto as jest.Mock).mockResolvedValue('file:///cropped.jpg');
        (profilesApi.uploadAvatar as jest.Mock).mockResolvedValue({ data: NEW });
        pressAlertButton('Choose from gallery');
        const { getByTestId, onChange } = renderIt();

        await act(async () => {
            fireEvent.press(getByTestId('avatar-change'));
        });

        await waitFor(() => expect(onChange).toHaveBeenCalledWith(NEW));
        expect(pickAvatarPhoto).toHaveBeenCalledWith('library');
        expect(profilesApi.uploadAvatar).toHaveBeenCalledWith('file:///cropped.jpg');
        expect(cachePath).toHaveBeenCalledWith(photoCacheKey(OLD.avatarThumbUrl));
        expect(cachePath).not.toHaveBeenCalledWith(photoCacheKey(NEW.avatarThumbUrl));
    });

    it('no Remove button for a provider (Google/Truecaller) picture, which is not ours to delete', () => {
        const { queryByTestId } = renderIt({ ...OLD, hasUploadedAvatar: false });
        expect(queryByTestId('avatar-remove')).toBeNull();
    });

    it('the visibility switch saves the setting and reverts it on failure', async () => {
        (profilesApi.setAvatarVisibility as jest.Mock).mockRejectedValueOnce(new Error('503'));
        jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
        const { getByTestId, onChange } = renderIt();

        await act(async () => {
            fireEvent(getByTestId('avatar-visibility'), 'valueChange', false);
        });

        expect(profilesApi.setAvatarVisibility).toHaveBeenCalledWith(false);
        expect(onChange).toHaveBeenNthCalledWith(1, { ...OLD, showAvatarToTeam: false });
        expect(onChange).toHaveBeenLastCalledWith({ ...OLD, showAvatarToTeam: true });
    });

    it('offline: change and remove are disabled', () => {
        useSyncStore.setState({ isConnected: false });
        const { getByTestId } = renderIt();
        expect(getByTestId('avatar-change').props.accessibilityState).toMatchObject({ disabled: true });
        expect(getByTestId('avatar-remove').props.accessibilityState).toMatchObject({ disabled: true });
    });
});
