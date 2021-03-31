import { Morphism, Vector2, Vector3 } from "../../lib/types";
import * as Vec3 from '../../lib/vec3';
import { Camera } from '../camera/camera';
import { calculateFrustumPaddingOffset, calculateFrustumSize, getCameraDirection, isPointInsideFrustum } from "../camera/frustum-culling";
import { PerspectiveCamera } from '../camera/perspective-camera';


/*
	frustum culling specifically for voxels
*/

const voxelBoundingRadius = Math.sqrt(3) / 2;

export const isVoxelBehindCamera = (cam: Camera) => {
	const forward = getCameraDirection(cam);
	const camPos = cam.transform.position;
	return (worldVoxel: Vector3): boolean => {
		const relVoxel = Vec3.subtract(worldVoxel, camPos);
		return Vec3.dot(relVoxel, forward) < -voxelBoundingRadius;
	};
};

export const frustumCullVoxel = (frustumOffset: number, frustumSize: Vector2, toCamSpace: Morphism<Vector3, Vector3>) => (worldVoxel: Vector3): boolean => {
	let camSpaceVoxel = toCamSpace(worldVoxel);
	camSpaceVoxel[2] += frustumOffset;
	return isPointInsideFrustum(frustumSize, camSpaceVoxel);

};
export const frustumCullVoxels = (cam: PerspectiveCamera, toCamSpace: Morphism<Vector3, Vector3>) => (worldVoxels: Vector3[]): Vector3[] => {
	const frustum = calculateFrustumSize(cam);
	const frustumOffsetNum = calculateFrustumPaddingOffset(frustum, 2 * voxelBoundingRadius);
	return worldVoxels.filter(
		frustumCullVoxel(frustumOffsetNum, frustum, toCamSpace)
	)
};