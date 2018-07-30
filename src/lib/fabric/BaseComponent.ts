import * as React from 'react'
import { Async } from './Async'
import { EventGroup } from './EventGroup'
import { IDisposable } from './IDisposable'
import {
  warnDeprecations,
  warnMutuallyExclusive,
  warnConditionallyRequiredProps,
  ISettingsMap,
} from './warn'
import { initializeFocusRects } from './initializeFocusRects'
import { initializeDir } from './initializeDir'
import { IRefObject } from './createRef'

/**
 * BaseProps interface.
 *
 * @public
 */
// tslint:disable-next-line:no-any
export interface IBaseProps<T = any> {
  componentRef?: IRefObject<T>
}

/**
 * BaseComponent class, which provides basic helpers for all components.
 *
 * @public
 */
export class BaseComponent<TProps extends IBaseProps = {}, TState = {}> extends React.Component<
  TProps,
  TState
> {
  /**
   * @deprecated Use React's error boundaries instead.
   */
  // tslint:disable-next-line:no-any
  public static onError: ((errorMessage?: string, ex?: any) => void)

  /**
   * Controls whether the componentRef prop will be resolved by this component instance. If you are
   * implementing a passthrough (higher-order component), you would set this to false and pass through
   * the props to the inner component, allowing it to resolve the componentRef.
   */
  protected _skipComponentRefResolution: boolean

  // tslint:disable:variable-name
  private __async: Async
  private __events: EventGroup
  private __disposables: IDisposable[] | null
  private __resolves: { [name: string]: (ref: React.ReactNode) => React.ReactNode }
  private __className: string
  // tslint:enable:variable-name

  /**
   * BaseComponent constructor
   * @param props - The props for the component.
   * @param context - The context for the component.
   */
  // tslint:disable-next-line:no-any
  constructor(props: TProps, context?: any) {
    super(props, context)

    // Ensure basic assumptions about the environment.
    initializeFocusRects()
    initializeDir()

    makeAllSafe(this, BaseComponent.prototype, [
      'componentWillMount',
      'componentDidMount',
      'shouldComponentUpdate',
      'componentWillUpdate',
      'componentWillReceiveProps',
      'render',
      'componentDidUpdate',
      'componentWillUnmount',
    ])
  }

  /**
   * When the component will receive props, make sure the componentRef is updated.
   */
  // tslint:disable-next-line:no-any
  public componentWillReceiveProps(newProps: Readonly<TProps>, newContext: any): void {
    this.updateComponentRef(this.props, newProps)
  }

  /**
   * When the component has mounted, update the componentRef.
   */
  public componentDidMount(): void {
    this.setComponentRef(this.props.componentRef, this)
  }

  /**
   * If we have disposables, dispose them automatically on unmount.
   */
  public componentWillUnmount(): void {
    this.setComponentRef(this.props.componentRef, null)

    if (this.__disposables) {
      for (let i = 0, len = this._disposables.length; i < len; i++) {
        const disposable = this.__disposables[i]

        if (disposable.dispose) {
          disposable.dispose()
        }
      }
      this.__disposables = null
    }
  }

  /**
   * Gets the object's class name.
   */
  public get className(): string {
    if (!this.__className) {
      const funcNameRegex = /function (.{1,})\(/
      const results = funcNameRegex.exec(this.constructor.toString())

      this.__className = results && results.length > 1 ? results[1] : ''
    }

    return this.__className
  }

  /**
   * Allows subclasses to push things to this._disposables to be auto disposed.
   */
  protected get _disposables(): IDisposable[] {
    if (!this.__disposables) {
      this.__disposables = []
    }
    return this.__disposables
  }

  /**
   * Gets the async instance associated with the component, created on demand. The async instance gives
   * subclasses a way to execute setTimeout/setInterval async calls safely, where the callbacks
   * will be cleared/ignored automatically after unmounting. The helpers within the async object also
   * preserve the this pointer so that you don't need to "bind" the callbacks.
   */
  protected get _async(): Async {
    if (!this.__async) {
      this.__async = new Async(this)
      this._disposables.push(this.__async)
    }

    return this.__async
  }

  /**
   * Gets the event group instance assocaited with the component, created on demand. The event instance
   * provides on/off methods for listening to DOM (or regular javascript object) events. The event callbacks
   * will be automatically disconnected after unmounting. The helpers within the events object also
   * preserve the this reference so that you don't need to "bind" the callbacks.
   */
  protected get _events(): EventGroup {
    if (!this.__events) {
      this.__events = new EventGroup(this)
      this._disposables.push(this.__events)
    }

    return this.__events
  }

  /**
   * Helper to return a memoized ref resolver function.
   * @param refName - Name of the member to assign the ref to.
   * @returns A function instance keyed from the given refname.
   * @deprecated Use `createRef` from React.createRef.
   */
  protected resolveRef(refName: string): (ref: React.ReactNode) => React.ReactNode {
    if (!this.__resolves) {
      this.__resolves = {}
    }

    if (!this.__resolves[refName]) {
      // tslint:disable-next-line:no-any
      this.__resolves[refName] = (ref: React.ReactNode) => {
        // tslint:disable-next-line:no-any
        return ((this as any)[refName] = ref)
      }
    }

    return this.__resolves[refName]
  }

  /**
   * Updates the componentRef (by calling it with "this" when necessary.)
   */
  protected updateComponentRef(currentProps: IBaseProps, newProps: IBaseProps = {}): void {
    if (currentProps.componentRef !== newProps.componentRef) {
      this.setComponentRef(currentProps.componentRef, null)
      this.setComponentRef(newProps.componentRef, this)
    }
  }

  /**
   * Warns when a deprecated props are being used.
   *
   * @param deprecationMap - The map of deprecations, where key is the prop name and the value is
   * either null or a replacement prop name.
   */
  protected warnDeprecations(deprecationMap: ISettingsMap<TProps>): void {
    warnDeprecations(this.className, this.props, deprecationMap)
  }

  /**
   * Warns when props which are mutually exclusive with each other are both used.
   *
   * @param mutuallyExclusiveMap - The map of mutually exclusive props.
   */
  protected warnMutuallyExclusive(mutuallyExclusiveMap: ISettingsMap<TProps>): void {
    warnMutuallyExclusive(this.className, this.props, mutuallyExclusiveMap)
  }

  /**
   * Warns when props are required if a condition is met.
   *
   * @param requiredProps - The name of the props that are required when the condition is met.
   * @param conditionalPropName - The name of the prop that the condition is based on.
   * @param condition - Whether the condition is met.
   */
  protected warnConditionallyRequiredProps(
    requiredProps: string[],
    conditionalPropName: string,
    condition: boolean,
  ): void {
    warnConditionallyRequiredProps(
      this.className,
      this.props,
      requiredProps,
      conditionalPropName,
      condition,
    )
  }

  private setComponentRef<TRefInterface>(
    ref: IRefObject<TRefInterface> | undefined,
    value: TRefInterface | null,
  ): void {
    if (!this._skipComponentRefResolution && ref) {
      if (typeof ref === 'function') {
        ref(value)
      }

      if (typeof ref === 'object') {
        // tslint:disable:no-any
         (ref as any).current = value
      }
    }
  }
}

/**
 * Helper to override a given method with a wrapper method that can try/catch the original, but also
 * ensures that the BaseComponent's methods are called before the subclass's. This ensures that
 * componentWillUnmount in the base is called and that things in the _disposables array are disposed.
 */
function makeAllSafe(obj: BaseComponent<{}, {}>, prototype: Object, methodNames: string[]): void {
  for (let i = 0, len = methodNames.length; i < len; i++) {
    makeSafe(obj, prototype, methodNames[i])
  }
}

function makeSafe(obj: BaseComponent<{}, {}>, prototype: Object, methodName: string): void {
  // tslint:disable:no-any
  const classMethod = (obj as any)[methodName]
  const prototypeMethod = (prototype as any)[methodName]
  // tslint:enable:no-any

  if (classMethod || prototypeMethod) {
    // tslint:disable-next-line:no-any
     (obj as any)[methodName] = function (): any {
      let retVal

      if (prototypeMethod) {
        retVal = prototypeMethod.apply(this, arguments)
      }
      if (classMethod !== prototypeMethod) {
        retVal = classMethod.apply(this, arguments)
      }

      return retVal
    }
  }
}

/**
 * Simple constant function for returning null, used to render empty templates in JSX.
 *
 * @public
 */
export function nullRender(): JSX.Element | null {
  return null
}
