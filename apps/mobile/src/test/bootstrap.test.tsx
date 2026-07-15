/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { bootstrapAliasValue } from '@/test/bootstrap';

describe('test bootstrap', () => {
  it('resolves source aliases in React Native tests', async () => {
    const { getByText } = await render(<Text>{bootstrapAliasValue}</Text>);

    expect(getByText('mobile-test-bootstrap')).toBeTruthy();
  });
});
