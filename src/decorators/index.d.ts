export declare function Bind(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
): PropertyDescriptor

export declare function Injectable<T extends abstract new (...args: any[]) => object>(
  target: T
): T

export declare function Readonly(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
): PropertyDescriptor

export declare function Controller(target: Function): void
export declare function Router(options: { alias: string; route: string }): ClassDecorator