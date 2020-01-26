import { Middleware } from './compose';

export const HOOKS: string = Symbol('@feathersjs/hooks') as any;
export const CONTEXT: string = Symbol('@feathersjs/hooks/context') as any;

/**
 * @param target The target object or function
 * @param middleware
 */
export function registerMiddleware<T> (target: T, middleware: Middleware[]) {
  const current: Middleware[] = (target as any)[HOOKS] || [];

  (target as any)[HOOKS] = current.concat(middleware);

  return target;
}

export function getMiddleware<T> (target: any): Array<Middleware<T>> {
  return (target && target[HOOKS]) || [];
}

/**
 * @param target The target object or function
 * @param updaters
 */
export function registerContextUpdater<T> (target: T, updaters: ContextUpdater[]) {
  const current: ContextUpdater[] = (target as any)[CONTEXT] || [];

  (target as any)[CONTEXT] = current.concat(updaters);

  return target;
}

export function getContextUpdater<T> (target: any): Array<ContextUpdater<T>> {
  return (target && target[CONTEXT]) || [];
}

/**
 * The base hook context.
 */
export class HookContext<T = any, C = any> {
  result?: T;
  method?: string;
  self: C;
  arguments: any[];
  [key: string]: any;

  constructor (data: { [key: string]: any } = {}) {
    Object.assign(this, data);
  }
}

/**
 * A function that updates the hook context with the `this` reference and
 * arguments of the function call.
 */
export type ContextUpdater<T = any> = (self: any, fn: any, args: any[], context: HookContext<T>) => HookContext<T>;
/**
 * A function that for a given function, calling context and arguments returns the list of hooks
 */
export type MiddlewareCollector<T = any> = (self: any, fn: any, args: any[]) => Array<Middleware<T>>;

/**
 * Available options when initializing hooks with more than just an array of middleware
 */
export interface FunctionHookOptions<T = any> {
  middleware: Array<Middleware<T>>;
  context: Array<ContextUpdater<T>>;
  collect: MiddlewareCollector<T>;
}

export type HookSettings<T = any> = Array<Middleware<T>>|Partial<Omit<FunctionHookOptions, 'context'> & {
  context: ContextUpdater<T>|Array<ContextUpdater<T>>;
}>;

export function defaultCollectMiddleware<T = any> (self: any, fn: any, _args: any[]) {
  return [
    ...getMiddleware<T>(self),
    ...getMiddleware(fn)
  ];
}

export function normalizeOptions<T = any> (opts: any): FunctionHookOptions<T> {
  const options: Partial<FunctionHookOptions> = Array.isArray(opts) ? { middleware: opts } : opts;
  const {
    middleware = [],
    context = withParams(),
    collect = defaultCollectMiddleware
  } = options;

  const contextUpdaters = Array.isArray(context) ? context : [context];

  return { middleware, context: contextUpdaters, collect };
}

export function collectContextUpdaters<T = any> (self: any, fn: any, _args: any[]) {
  return [
    ...getContextUpdater<T>(self),
    ...getContextUpdater(fn)
  ];
}

/**
 * Returns a ContextUpdater function that turns function arguments like
 * `function (data, name)` into named properties (`context.data`, `context.name`)
 * on the hook context
 *
 * @param params The list of parameter names
 */
export function withParams<T = any> (...params: string[]) {
  return (self: any, _fn: any, args: any[], context: HookContext<T>) => {
    params.forEach((name, index) => {
      context[name] = args[index];
    });

    if (params.length > 0) {
      Object.defineProperty(context, 'arguments', {
        get (this: HookContext<T>) {
          const result = params.map(name => this[name]);

          return Object.freeze(result);
        }
      });
    } else {
      context.arguments = args;
    }

    if (self) {
      context.self = self;
    }

    return context;
  };
}

/**
 * Returns a ContextUpdater function that adds default values on the hook context
 *
 * @param defaults Default values
 */
export function withDefaults<T = any> (defaults: any) {
  return (_self: any, _fn: any, _args: any[], context: HookContext<T>) => {
    const keys = Object.keys(defaults);

    for (const key of keys) {
      if (context[key] === undefined) {
        context[key] = defaults[key];
      }
    }

    return context;
  };
}

/**
 * Returns a ContextUpdater function that adds props on the hook context
 *
 * @param props The props object to assign
 */
export function withProps<T = any> (props: any) {
  return (_self: any, _fn: any, _args: any[], context: HookContext<T>) => {
    Object.assign(context, props);

    return context;
  };
}
