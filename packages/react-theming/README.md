# Summary

`react-theming` provides a set of tools for creating themable
components. The `createComponent` tool extends unstyled components by
applying given options and contextual overrides provided through React
context, computes injected props including `classes`, `slots`, and
`slotProps`. Styles are computed only when encountering unique theme
objects per component, resulting in optimized performance.

Example usage:

```jsx
import { SliderBase } from 'implementation';
import { createComponent } from '@fluentui/react-theming';

export const Slider = createComponent(SliderBase, {
  // the themable name of the component
  name: 'Slider'

  // the set of replacement tokens to be injected into the styles
  tokens,

  // The css styling to be injected as a `classes` prop
  styles

  // A dictionary of React components representing the actual subcomponents to be used by the Slider
  slots
});

// Created components can be further extended to alter look and feel.
export const RedSlider = createComponent(Slider, {
  tokens: { railColor: 'red' }
});
```

Theming is achieved by using the `Provider` component (also provided):

```tsx
// Create a theme with a token override for the Slider.
const theme = createTheme({
  components: {
    Slider: {
      tokens: {
        railColor: 'green',
      },
    },
  },
});

// Render the slider using the theme.
const App = () => (
  <Provider theme={theme}>
    <Slider />
  </Provider>
);
```

## Principles

Key principles of `react-theming`:

- allow any base component following the contract (explained in
  "createComponent API surface") to be extended (and therefore
  styled).
- should be future proof, and not coupled to a specific styling/css implementation

## Who is `createComponent` for?

### Component authors

Components created with `createComponent` are styleable by end user
applications, and provide a separation of concerns when adressing
multiple design systems or styling implementations.

### Application authors

Application authors should find value using `createComponent`, as
existing library components will be easily extendable, and new
components can be effortlessly created that tie in to existing themes.

## When should I use `createComponent`?

- When creating a component that should be themeable.
- When overriding major details of an existing component. (Explained
  later in "Overriding (tokens|slots) with a new component".)

## What's in a theme?

> TODO: document theme

# Using components created with `createComponent`

Components created with `createComponent` should exist in the context
of a `Provider`. All other patterns common to developing with React
controls should be standard.

## Styling components with a theme

> TODO: document theme

## Customizing with tokens

Frequently, design needs of a specific product conflict with that of
the base design system. To accomodate necessary changes, `Tokens`
exist to allow easy modification of most all aspects of look and feel.

A token is a key that corresponds to a value, usually from from the
applied theme. Examples of tokens might be `fontSize`, `fontFamily`,
`borderRadius`, `animationDuration`, and `labelHoveredBackground`.

### Setting tokens with a theme

To understand the set of tokens that a specific component understands,
refer to the documentation of that component. For this example, we will
assume that a `Button` component exists that supports the following
tokens:

- `backgroundColor`
- `fontSize`
- `backgroundHoverColor`

To override any (or all) of the Button's tokens, an object should be
provided within the theme under:

```{.json}
{
  "components": {
    "Button": {
      "tokens": {
        "values": "here..."
      }
    }
  }
}
```

Tokens are represented by the following:

1.  Function

    A functional token is the preferred method of adjusting look and
    feel. Functional tokens reference values in the applied theme.

    ```{.javascript org-language="js"}
    {
      "components": {
        "Button": {
          "tokens": {
            "fontSize": t => t.fonts.base, // pull some value from the theme
          }
        }
      }
    }
    ```

2.  Literal value

    A literal value allows a token to be hard-coded. It is considered
    the least desirable (as it will never be affected by other changes
    in the theme).

    A literal token in practice looks like:

    ```{.json}
    {
      "components": {
        "Button": {
          "tokens": {
            "fontSize": 12
          }
        }
      }
    }
    ```

3.  Dependent value

    There are several cases where the value of a token is based on a
    calculation of another value. For instance, the background hover
    color of a button might be desired to be a shade lighter than the
    default background color of the button. (In order to specify this,
    assume we have a `lighten()` function available.)

    ```{.javascript org-language="js"}
    {
      "components": {
        "Button": {
          "tokens": {
            "backgroundHoverColor": {
              dependsOn: ['backgroundColor'],
              value: ([backgroundColor: Color]) => invert(backgroundColor)
            }
          }
        }
      }
    }
    ```

### Customizing components with variants

`createComponent` supports variants, where a variant represents a new
prop that implies a set of styles. Examples of expected variants for a
button might be `circle`, `size`, or `primary`.

Variants are specified in the call to `createComponent` along with
additional tokens and styles. Variant arguments represent the keys in
the defintion passed to `createComponent`.

```{.javascript org-language="js"}
const DeluxeButton = createComponent(Button, {
  variants: {
    size: {
      small: { // used via <DeluxeButton size="small" />
        tokens: t => {
          return { fontSize: t.fonts.smallest }
        }
      },
      large: { // used via <DeluxeButton size="large" />
        tokens: t => {
          return { fontSize: t.fonts.largest }
        }
      },
    },
    primary: {
      true: { // used via <DeluxeButton primary />
        tokens: t => {
          return { shadowColor: t.accents[1]; }
        },
        styles: tokens => {
          return {
            root: {
              boxShadow: "5px 5px #{tokens.shadowColor}"
            }
          }
        }
      }
    }
  },
});
```

## Customizing with slots

While tokens affect the look and feel of rendered elements, `slots`
provides a way to make more significant adjustments to a component\'s
structure and behavior.

A slot is a rendered DOM element or higher level control that can be
replaced at runtime.

As an example, a `Checkbox` might choose to render a `label` element to
hold descriptive text. If a use-case called for a proprietary
`<MyLabel />` control instead of a `label`, that slot could be targeted
for replacement.

### Overriding slots with a theme

To override a slot from a theme, specify a reference to the component in
the theme.

```{.javascript org-language="js"}
import { MyLabel } from 'my-library';
{
  "components": {
    "Checkbox": {
      "slots": {
        "label": MyLabel
      }
    }
  }
}
```

### Overriding slots with a new component

`createComponent` can also specify slot assignments directly. (This is
the expected usage for component libraries.)

```{.javascript org-language="js"}
import { MyLabel } from 'my-library';

const MyCheckbox = compse(Checkbox, {
  slots: {
    label: MyLabel
  }
});
```

# Creating a base component

A base component is an unstyled component that contains desired behaviors.

A base component should anticipate 2 special `props` and behave accordingly.

## `props.slots`

`slots` defines the control that should be rendered in each
slot. The outermost component should always be named `root`, and other
child components should be given predictable names and documented.

## `props.slotProps`

There will be an entry in `slotProps` for each accompanying `slot`.
The base component is responsible for merging user-provided props with
`slotProps`, then passing them to the according `slot` for rendering.

# Theming a component

In order to apply a theme to a component, each base component should
be wrapped by `createComponent` along with accompanying styling.

## Understanding tokens

Tokens are the exclusive means of getting data from a theme into a
component. Tokens should be specified for every aspect of a control\'s
look and feel.

Tokens should be named according to the following anatomy:

    {slot (or none for root)}{property}{state (or none for default)}

Examples:

- `thumbSizeHovered`
- `backgroundColor`
- `labelBorderDisabled`

## Understanding styles

After evaluating tokens, the tokens are passed to a `style` function.
The `style` function should return an object which can be rendered by
the CSS renderer chosen for the design system. Likely CSS renderers
include `Fela`, `mergeStyles`, and `JSS`.

Example targeting `JSS`:

```{.javascript org-language="js"}
const styles = (tokens: MyComponentTokens) => {
  return {
    root: {
      backgroundColor: tokens.backgroundColor,
      '&:hover': {
        backgroundColor: tokens.backgroundHoverColor
      }
    },
    widget: {
      borderColor: tokens.borderColor
    }
  };
}
```

## Understanding slots

Components should define a set of logical elements that are reasonable
to replace. Additionally, sensible defaults should be provided. Slots
provide an opportunity for callers to late-bind sections for
replacement.

TODO: examples of more slots

## Writing the base component

Any functional component can be used with `createComponent`. However, there are
several conventions that should be respected in order to make the user
experience predictable.

A good base component deviates from a run-of-the-mill component in 3
ways:

- It should have no built-in opinion of styling. When styled via
  `createComponent`, class names will be passed in via `slotProps` to provide
  styling.
- It accepts a prop named `slots`, which define the component to use
  for subcomponents.
- It accepts a prop named `slotProps`, which will be handed off to
  subcomponents.

### Slots

TODO: Describe how to interact with slots

### Slot Props

TODO: Describe how to interact with slotProps

### Building in practice

A simple base component that renders a button might look like the
following:

```{.javascript org-language="js"}
interface Props {
  slots;
  slotProps;
  children;
  onClick;
}
const BaseButton: React.FunctionComponent<Props> = (props: Props) => {

  // First, define the slots
  // define `Root` as a const which renders the root.
  // Default to a button element.
  const { root: Root = 'button' } = props.slots || {};

  // Break out slot props to be passed to various components.
  // Mix in the props specified directly in props.
  const { root: rootProps } = props.slotProps || {};

  const resolvedRootProps = { ...rootProps, onClick: props.onClick };

  // Finally, render the component
  return <Root {...resolvedRootProps}>{props.children}</Root>
}
```

As components grow and become more complex, it is expected that hooks
will be developed to resolve state and intelligently merge `props` into
`slotProps`.

## Conformance

TODO: Describe how to run conformance tests to make sure that base
components appropriately react to theme changes.
