import React from 'react';
import { _composeFactory } from './compose';
import { ITheme } from './theme.types';

const compose = _composeFactory(() => makeBlankTheme());

const reifyTheme = (partial: Partial<ITheme>): ITheme => {
  const result = { components: {}, ...partial };

  return result as ITheme;
};

const makeBlankTheme = (): ITheme => {
  return reifyTheme({});
};

const baseComponent = () => {
  // In a function so that side effects from compose don't affect the next run
  const c: React.FunctionComponent<{}> = (props: {}) => {
    return <div />;
  };
  return c;
};

describe('compose', () => {
  describe('variants', () => {
    it('allows variants to be defined', () => {
      const component = compose(baseComponent(), {
        variants: { test: {} },
      });
      expect((component as any).variants).toEqual({ test: {} });
    });

    describe('tokens', () => {
      it('does not resolve tokens when variant not rendered', () => {
        const myTokens = jest.fn();
        const component = compose(baseComponent(), {
          variants: { test: { tokens: myTokens } },
        });
        (component as any)({ test: false });
        expect(myTokens).not.toHaveBeenCalled();
      });

      it('resolves tokens', () => {
        const myTokens = jest.fn();
        const component = compose(baseComponent(), {
          variants: { test: { tokens: myTokens } },
        });
        (component as any)({ test: true });
        expect(myTokens).toHaveBeenCalled();
      });
    });
  });
});
