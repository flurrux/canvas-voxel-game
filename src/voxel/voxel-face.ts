import { Vector3 } from "../../lib/types";

export type VoxelFaceNormal = [1, 0, 0] | [-1, 0, 0] | [0, 1, 0] | [0, -1, 0] | [0, 0, 1] | [0, 0, -1];
export const voxelFaceNormals: VoxelFaceNormal[] = [
	[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
];

export function getNonZeroIndex(normal: VoxelFaceNormal): number {
	for (let i = 0; i < 3; i++){
		if (normal[i] !== 0) return i;
	}
}

export type VoxelFace = {
	position: Vector3, 
	normal: VoxelFaceNormal
}