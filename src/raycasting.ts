import { Vector3 } from "../lib/types";
import { VoxelFaceNormal, voxelFaceNormals } from "./voxel";
import { Option, isNone, isSome, some, none } from 'fp-ts/lib/Option';
import { Semigroup, getJoinSemigroup, getMeetSemigroup, fold } from 'fp-ts/lib/Semigroup';
import { ordNumber, contramap } from 'fp-ts/lib/Ord'
import * as Vec3 from '../lib/vec3';
import { Camera } from "./camera/camera";

export type Ray = {
	origin: Vector3, 
	vector: Vector3
};

export type RaycastResult = {
	distance: number,
	localPoint: Vector3, 
	globalPoint: Vector3,  
	faceNormal: VoxelFaceNormal, 
	voxel: Vector3, 
};

const raycastSemigroup: Semigroup<RaycastResult> = getMeetSemigroup(
	contramap((r: RaycastResult) => r.distance)(ordNumber)
);

//[alongAxis, alongPlane]
function decompose(v: Vector3, axis: Vector3): [Vector3, Vector3] {
	const alongAxis = Vec3.project(axis, v);
	return [alongAxis, Vec3.subtract(v, alongAxis)];
}

function isPointOutsideVoxel([x, y, z]: Vector3): boolean {
	return x < -0.5 || x > +0.5 || y < -0.5 || y > +0.5 || z < -0.5 || z > +0.5;
}

export function raycastPlane(localRay: Ray, planeOrigin: Vector3, normal: VoxelFaceNormal): Option<Vector3> {
	const { origin, vector } = localRay;
	const relOrigin = Vec3.subtract(origin, planeOrigin);
	const originCombination = decompose(relOrigin, normal);
	const vectorCombination = decompose(vector, normal);
	if (Vec3.dot(originCombination[0], vectorCombination[0]) >= 0) return none;
	const planeStartPoint = Vec3.subtract(relOrigin, originCombination[0]);
	const intersectionScale = Vec3.magnitude(originCombination[0]) / Vec3.magnitude(vectorCombination[0]);
	const intersectionPoint = Vec3.add(
		planeOrigin,
		Vec3.add(
			planeStartPoint,
			Vec3.multiply(vectorCombination[1], intersectionScale)
		)
	);
	return some(intersectionPoint);
}

function raycastVoxelFace(localRayOrigin: Vector3, rayVector: Vector3, normal: VoxelFaceNormal): Option<Vector3> {
	const faceOrigin = Vec3.multiply(normal, 0.5);
	const planeIntersectionOpt = raycastPlane(
		{ origin: localRayOrigin, vector: rayVector }, 
		faceOrigin, normal
	);
	if (isNone(planeIntersectionOpt)) return none;
	const intersectionPoint = planeIntersectionOpt.value;
	if (isPointOutsideVoxel(intersectionPoint)) return none;
	return planeIntersectionOpt;
}

function foldRaycastResults(results: Option<RaycastResult>[]): Option<RaycastResult> {
	const filteredResults = results.filter(isSome).map(r => r.value);
	if (filteredResults.length === 0) return none;
	return some(
		fold(raycastSemigroup)(filteredResults[0], filteredResults.slice(1))
	)
}

const raycastVoxel = (ray: Ray) => (voxel: Vector3): Option<RaycastResult> => {
	const localOrigin = Vec3.subtract(ray.origin, voxel);
	return foldRaycastResults(
		voxelFaceNormals.map(
			faceNormal => {
				const curResult = raycastVoxelFace(localOrigin, ray.vector, faceNormal);
				if (isNone(curResult)) return none;
				const localPoint = curResult.value;
				return some({
					localPoint,
					globalPoint: Vec3.add(voxel, localPoint),
					voxel, faceNormal, 
					distance: Vec3.distance(localOrigin, localPoint)
				})
			}
		)
	)
}

export function raycastVoxels(ray: Ray, voxels: Vector3[]): Option<RaycastResult> {
	const allResults = voxels.map(raycastVoxel(ray));
	const filteredResults = allResults.filter(isSome).map(r => r.value);
	if (filteredResults.length === 0) return none;
	return some(
		fold(raycastSemigroup)(filteredResults[0], filteredResults.slice(1))
	)
}


export function createCameraRay(camera: Camera): Ray {
	const { transform } = camera;
	return {
		origin: transform.position,
		vector: transform.orientation.slice(6) as Vector3
	};
}
function raycastGround(ray: Ray): Option<RaycastResult> {
	const planeIntersectionOpt = raycastPlane(ray, [0, -0.5, 0], [0, 1, 0]);
	if (isNone(planeIntersectionOpt)) return none;
	const isecPoint = planeIntersectionOpt.value;
	return some({
		distance: Vec3.distance(ray.origin, isecPoint),
		faceNormal: [0, 1, 0],
		localPoint: isecPoint, globalPoint: isecPoint,
		voxel: [
			Math.round(isecPoint[0]),
			-1,
			Math.round(isecPoint[2])
		]
	})
}

//raycast along the line of sight and find the face of a hit voxel or the ground
export function performGazeRaycast(camera: Camera, voxels: Vector3[]): Option<RaycastResult> {
	const ray = createCameraRay(camera);
	const voxelResult = raycastVoxels(ray, voxels);
	if (isSome(voxelResult)) return voxelResult;
	return raycastGround(ray);
}