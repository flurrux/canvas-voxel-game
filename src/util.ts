import { flow, not } from 'fp-ts/lib/function';
import { Vector3, Vector2, Morphism } from '../lib/types';
import * as Vec3 from '../lib/vec3';

export const randomVector = (maxMag: number = 2) : Vector3 => [0, 1, 2].map(() => (Math.random() - 0.5) * maxMag) as Vector3;
export const randomColor = () : string => `rgb(${[0, 1, 2].map(() => Math.round(Math.random() * 255)).join(",")})`;
export const randomRange = (min: number, max: number) => min + (max - min) + Math.random();
export const scaleVector = (scale: number) => ((vec: Vector2) => [vec[0] * scale, vec[1] * scale]);
export const randomUnitVector = () : Vector3 => Vec3.normalize([0, 1, 2].map(() => Math.random() - 0.5) as Vector3);

export const createArray = (length: number): any[] => {
    const arr = [];
    for (let i = 0; i < length; i++){
        arr[i] = i;
    }
    return arr;
};

export function normalize(from: number, to: number, value: number): number {
	return (value - from) / (to - from);
}

export const mapRange = (range1: [number, number], range2: [number, number], value: number): number => {
	const relVal = value - range1[0];
	const scale = (range2[1] - range2[0]) / (range1[1] - range1[0]);
	return range2[0] + relVal * scale;
};

export const setY = (y: number) => (v: Vector3) => [v[0], y, v[2]] as Vector3;
export const setYZero = setY(0);
export const flattenY = flow(setYZero, Vec3.normalize);

const voxelExistsAt = (voxels: Vector3[], point: Vector3): boolean => {
	return voxels.some(v => Vec3.equal(v, point));
};
const voxelExistsOrIsGroundAt = (voxels: Vector3[]) => (point: Vector3): boolean => {
	if (point[1] < 0) return true;
	return voxelExistsAt(voxels, point);
};
const enclosingOffsets: Vector3[] = [
	[1, 0, 0], [-1, 0, 0], 
	[0, 1, 0], [0, -1, 0], 
	[0, 0, 1], [0, 0, -1]
];
export const isVoxelEnclosed = (voxels: Vector3[]) => (voxel: Vector3): boolean => {
	return enclosingOffsets.map(offset => Vec3.add(voxel, offset)).every(voxelExistsOrIsGroundAt(voxels))
}
export function removeEnclosedVoxels(voxels: Vector3[]): Vector3[] {
	return voxels.filter(not(isVoxelEnclosed(voxels)));
}

export const startLoop = (onLoop: Morphism<number, void>) => {
	let prevTime = 0;
	const loop = () => {
		const curTime = window.performance.now();
		const deltaTime = (curTime - prevTime) / 1000;
		prevTime = curTime;
		onLoop(deltaTime);
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
};

export function range(start: number, end: number): number[] {
	const array: number[] = [];
	for (let i = start; i < end; i++) {
		array.push(i);
	}
	return array;
}

export type ArrayWithIndices<T> = [number, T][];
export function withIndices<T>(array: T[]): ArrayWithIndices<T> {
	return range(0, array.length).map(index => [index, array[index]])
}