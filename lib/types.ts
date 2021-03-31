export type Matrix3 = [number, number, number, number, number, number, number, number, number];
export type Vector3 = [number, number, number];
export type Vector2 = [number, number];

export type Morphism<A, B> = (a: A) => B;
export type Transformation<T> = Morphism<T, T>;