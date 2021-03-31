import { Vector3 } from "../../lib/types";
import { createArray } from "../util";
import * as Vec3 from '../../lib/vec3';

export function createSphereVoxels(radius: number): Vector3[] {
	const voxels: Vector3[] = [];
	const s = radius + 1;
	for (let x = -s; x <= s; x++) {
		for (let y = 0; y <= s; y++) {
			for (let z = -s; z <= s; z++) {
				const voxel: Vector3 = [x, y, z];
				const mag = Vec3.magnitude(voxel);
				if (Math.abs(mag - radius) > 0.5) continue;
				voxels.push(voxel);
			}
		}
	}
	return voxels;
}

export function createCircleVoxels(radius: number): Vector3[] {
	const voxels: Vector3[] = [];
	const s = radius + 1;
	const yOffset = Math.round(0.7 * s);
	const endY = s + yOffset;
	for (let x = -s; x <= s; x++) {
		for (let y = 0; y <= endY; y++) {
			const voxel: Vector3 = [x, y - yOffset, 0];
			const mag = Vec3.magnitude(voxel);
			if (Math.abs(mag - radius) > 1) continue;
			voxels.push([x, y, 0]);
		}
	}
	return voxels;
}

export function createTower(startPoint: Vector3, height: number): Vector3[] {
	return createArray(height).map(n => Vec3.add(startPoint, [0, n, 0] as Vector3))
}

export function createBlock(startPoint: Vector3, size: Vector3): Vector3[] {
	const voxels: Vector3[] = [];
	for (let x = 0; x < size[0]; x++) {
		for (let y = 0; y < size[1]; y++) {
			for (let z = 0; z < size[2]; z++) {
				voxels.push(Vec3.add(startPoint, [x, y, z]));
			}
		}
	}
	return voxels;
}