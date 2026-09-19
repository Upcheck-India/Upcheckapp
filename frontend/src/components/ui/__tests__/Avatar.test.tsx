import React from 'react';
import { render } from '@testing-library/react-native';
import { Avatar, toneFor } from '../Avatar';
import { photoCacheKey } from '../PhotoStrip';

const sourceOf = (el: any) => [].concat(el.props.source)[0];

describe('Avatar', () => {
    it('shows the picture disk-cached under the stable (signature-free) key', () => {
        const uri = 'https://b.r2/avatars/u1/a.thumb.webp?X-Amz-Signature=abc';
        const { getByTestId, queryByText } = render(<Avatar uri={uri} initials="RK" seed="u1" testID="av" />);
        const img = getByTestId('av');
        expect(sourceOf(img)).toEqual({ uri, cacheKey: photoCacheKey(uri) });
        expect(img.props.cachePolicy).toBe('disk');
        expect(queryByText('RK')).toBeNull();
    });

    it('falls back to initials in a coloured circle when there is no (or a hidden) picture', () => {
        const { getByText, getByTestId, queryByTestId } = render(<Avatar uri={null} initials="RK" seed="u1" testID="av" />);
        expect(getByText('RK')).toBeTruthy();
        expect(queryByTestId('av')).toBeNull();
        const style = [].concat(getByTestId('av-initials').props.style).reduce((a: any, s: any) => ({ ...a, ...s }), {});
        expect(style.backgroundColor).toBe(toneFor('u1').bg);
    });

    it('gives one person the same colour every time', () => {
        expect(toneFor('user-a')).toBe(toneFor('user-a'));
    });
});
