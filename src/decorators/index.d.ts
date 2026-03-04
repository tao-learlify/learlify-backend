export declare function Bind(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
): PropertyDescriptor

export interface CronScheduleOptions {
  timezone?: string
  [key: string]: unknown
}

export interface CronTrigger {
  schedule(
    expression: string,
    callback: () => void | Promise<void>,
    options?: CronScheduleOptions
  ): unknown
}

export declare function CronSchedule<
  T extends abstract new (...args: unknown[]) => object
>(target: T): T & {
  new (...args: ConstructorParameters<T>): InstanceType<T> & {
    trigger: CronTrigger
  }
}

export declare function Injectable<
  T extends abstract new (...args: unknown[]) => object
>(
  target: T
): T

export declare function Readonly(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
): PropertyDescriptor

export declare function Controller(
  target: abstract new (...args: unknown[]) => object
): void
export declare function Router(options: { alias: string; route: string }): ClassDecorator
