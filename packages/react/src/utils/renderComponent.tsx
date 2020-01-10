import { FocusZoneMode } from '@fluentui/accessibility'
import {
  AccessibilityActionHandlers,
  FocusZone,
  FocusZoneProps,
  FOCUSZONE_WRAP_ATTRIBUTE,
  getElementType,
  getUnhandledProps,
  ReactAccessibilityBehavior,
  unstable_getAccessibility as getAccessibility,
  getStyles,
} from '@fluentui/react-bindings'
import {
  ComponentSlotStylesPrepared,
  ComponentVariablesObject,
  DebugData,
  PropsWithVarsAndStyles,
  ThemePrepared,
} from '@fluentui/styles'
import * as _ from 'lodash'
import * as React from 'react'

import { ComponentSlotClasses } from '../themes/types'
import { Props, ProviderContextPrepared } from '../types'
import logProviderMissingWarning from './providerMissingHandler'
import Telemetry from './Telemetry'

export interface RenderResultConfig<P> {
  ElementType: React.ElementType<P>
  classes: ComponentSlotClasses
  unhandledProps: Props
  variables: ComponentVariablesObject
  styles: ComponentSlotStylesPrepared
  accessibility: ReactAccessibilityBehavior
  rtl: boolean
  theme: ThemePrepared
}

export type RenderComponentCallback<P> = (config: RenderResultConfig<P>) => any

export interface RenderConfig<P> {
  className?: string
  displayName: string
  handledProps: string[]
  props: PropsWithVarsAndStyles
  state: Record<string, any>
  actionHandlers: AccessibilityActionHandlers
  render: RenderComponentCallback<P>
  saveDebug: (debug: DebugData | null) => void
}

const renderComponent = <P extends {}>(
  config: RenderConfig<P>,
  context?: ProviderContextPrepared,
): React.ReactElement<P> => {
  const {
    className,
    displayName,
    handledProps,
    props,
    state,
    actionHandlers,
    render,
    saveDebug = () => {},
  } = config

  if (_.isEmpty(context)) {
    logProviderMissingWarning()
  }

  const { rtl = false, telemetry = undefined as Telemetry } = context || {}
  const startTime = telemetry && telemetry.enabled ? performance.now() : 0

  const ElementType = getElementType(props) as React.ReactType<P>
  const stateAndProps = { ...state, ...props }

  const accessibility: ReactAccessibilityBehavior = getAccessibility(
    displayName,
    props.accessibility,
    stateAndProps,
    rtl,
    actionHandlers,
  )
  // @ts-ignore TODO FIX ME
  const { classes, resolvedVariables, resolvedStyles, theme } = getStyles(
    { className, displayName, props: stateAndProps, saveDebug },
    context,
  )
  const unhandledProps = getUnhandledProps(handledProps, props)

  // @ts-ignore TODO FIX ME
  const resolvedConfig: RenderResultConfig<P> = {
    ElementType,
    unhandledProps,
    classes,
    variables: resolvedVariables,
    styles: resolvedStyles,
    accessibility,
    rtl,
    theme,
  }
  let wrapInFocusZone: (element: React.ReactElement) => React.ReactElement = element => element

  if (telemetry && telemetry.enabled) {
    const duration = performance.now() - startTime

    if (telemetry.performance[displayName]) {
      telemetry.performance[displayName].count++
      telemetry.performance[displayName].msTotal += duration
      telemetry.performance[displayName].msMin = Math.min(
        duration,
        telemetry.performance[displayName].msMin,
      )
      telemetry.performance[displayName].msMax = Math.max(
        duration,
        telemetry.performance[displayName].msMax,
      )
    } else {
      telemetry.performance[displayName] = {
        count: 1,
        msTotal: duration,
        msMin: duration,
        msMax: duration,
      }
    }
  }

  if (accessibility.focusZone && accessibility.focusZone.mode === FocusZoneMode.Wrap) {
    wrapInFocusZone = element =>
      React.createElement(
        FocusZone,
        {
          [FOCUSZONE_WRAP_ATTRIBUTE]: true,
          ...accessibility.focusZone.props,
          isRtl: rtl,
        } as FocusZoneProps & { [FOCUSZONE_WRAP_ATTRIBUTE]: boolean },
        element,
      )
  }

  if (accessibility.focusZone && accessibility.focusZone.mode === FocusZoneMode.Embed) {
    const originalElementType = resolvedConfig.ElementType

    resolvedConfig.ElementType = FocusZone as any
    resolvedConfig.unhandledProps = {
      ...resolvedConfig.unhandledProps,
      ...accessibility.focusZone.props,
    }
    resolvedConfig.unhandledProps.as = originalElementType
    resolvedConfig.unhandledProps.isRtl = resolvedConfig.rtl
  }

  return wrapInFocusZone(render(resolvedConfig))
}

export default renderComponent
