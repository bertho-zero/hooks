import { Middleware } from './compose';
import { functionHooks } from './function';
import { HookContext, registerMiddleware, normalizeOptions, HookSettings } from './base';

export interface HookMap {
  [key: string]: HookSettings;
}

export const objectHooks = (_obj: any, hooks: HookMap|Middleware[]) => {
  const obj = typeof _obj === 'function' ? _obj.prototype : _obj;

  if (Array.isArray(hooks)) {
    return registerMiddleware(obj, hooks);
  }

  return Object.keys(hooks).reduce((result, method) => {
    const value = obj[method];
    const options = normalizeOptions(hooks[method]);
    const originalContext = options.context;
    const context = (self: any, fn: any, args: any[], context: HookContext) => {
      const ctx = originalContext(self, fn, args, context);

      ctx.method = method;

      return ctx;
    };

    if (typeof value !== 'function') {
      throw new Error(`Can not apply hooks. '${method}' is not a function`);
    }

    result[method] = functionHooks(value, {
      ...options,
      context
    });

    return result;
  }, obj);
};
