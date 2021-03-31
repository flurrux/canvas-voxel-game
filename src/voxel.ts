import { Vector3 } from "../lib/types";

export type VoxelFaceNormal = [1, 0, 0] | [-1, 0, 0] | [0, 1, 0] | [0, -1, 0] | [0, 0, 1] | [0, 0, -1];
export const voxelFaceNormals: VoxelFaceNormal[] = [
	[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
];

export type VoxelFace = {
	position: Vector3, 
	normal: VoxelFaceNormal
}