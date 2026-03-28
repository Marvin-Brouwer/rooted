/** Export `T` from `Array<T>` or `T` */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : T
