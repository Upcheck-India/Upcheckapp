import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PhotoStrip, photoCacheKey, photoPairs } from '../PhotoStrip';

const signed = (path: string, sig: string) =>
    `https://upcheck-photos.acct.r2.cloudflarestorage.com/${path}?X-Amz-Date=${sig}&X-Amz-Signature=${sig}`;

/** expo-image hands the native view an array of sources. */
const sourceOf = (el: any) => [].concat(el.props.source)[0];

describe('photoCacheKey', () => {
    it('is the same for two signatures of one photo (the URL changes hourly)', () => {
        expect(photoCacheKey(signed('health/f/a.webp', '1'))).toBe(photoCacheKey(signed('health/f/a.webp', '2')));
        expect(photoCacheKey(signed('health/f/a.webp', '1'))).toBe(
            'https://upcheck-photos.acct.r2.cloudflarestorage.com/health/f/a.webp',
        );
    });

    it('differs between a photo and its thumbnail', () => {
        expect(photoCacheKey(signed('health/f/a.webp', '1'))).not.toBe(photoCacheKey(signed('health/f/a.thumb.webp', '1')));
    });
});

describe('photoPairs', () => {
    it('pairs each full URL with its thumbnail, falling back to the full URL', () => {
        expect(photoPairs(['A', 'B'], ['a'])).toEqual([
            { full: 'A', thumb: 'a' },
            { full: 'B', thumb: 'B' },
        ]);
    });
});

describe('PhotoStrip', () => {
    const full = signed('health/f/a.webp', 'x');
    const thumb = signed('health/f/a.thumb.webp', 'x');

    it('lists thumbnails, disk-cached under the stable key', () => {
        const { getByTestId } = render(<PhotoStrip full={[full]} thumbs={[thumb]} testID="p" />);
        const img = getByTestId('p');
        expect(sourceOf(img)).toEqual({ uri: thumb, cacheKey: photoCacheKey(thumb) });
        expect(img.props.cachePolicy).toBe('disk');
    });

    it('shows the FULL image when a thumbnail is tapped', () => {
        const { getByTestId, getByLabelText } = render(<PhotoStrip full={[full]} thumbs={[thumb]} testID="p" />);
        fireEvent.press(getByLabelText('View photo'));
        expect(sourceOf(getByTestId('photo-viewer-image'))).toEqual({ uri: full, cacheKey: photoCacheKey(full) });
    });
});
