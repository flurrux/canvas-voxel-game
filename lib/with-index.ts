import { range } from '../src/util';
import { Morphism } from './types';

export type WithIndex<T> = [number, T];
export const getIndex = <T>(w: WithIndex<T>) => w[0];
export const getValue = <T>(w: WithIndex<T>) => w[1];

export const map = <A, B>(m: Morphism<A, B>) => (w: WithIndex<A>): WithIndex<B> => [w[0], m(w[1])];

export type ArrayWithIndices<T> = WithIndex<T>[];
export function withIndices<T>(array: T[]): ArrayWithIndices<T> {
	return range(0, array.length).map(index => [index, array[index]])
}
export function getIndices<T>(array: ArrayWithIndices<T>): number[] {
	return array.map(getIndex)
}
export const getItems = <T>(array: T[]) => (indices: number[]): T[] => {
	return indices.map(index => array[index])
};