import { isNone, none, Option, some } from "fp-ts/lib/Option";
import { Vector2, Vector3 } from "../../lib/types";
import { Camera } from '../camera/camera';
import { PerspectiveCamera } from '../camera/perspective-camera';
import * as Vec2 from '../../lib/vec2';
import * as Vec3 from '../../lib/vec3';

/*
	the frustum is the pyramid-like shape of the cameras view into the scene.
	any point that can be projected visibly onto the screen lies in the frustum. 
	i know that the frustum is generally a truncated pyramid but in this case 
	i treat it like a pyramid. the truncation actually happens when rendering voxel faces. 
*/

export const getCameraDirection = (cam: Camera): Vector3 => cam.transform.orientation.slice(6) as Vector3;

export const isPointInFrontOfCamera = (cam: Camera) => {
	const camPosition = cam.transform.position;
	const forward = getCameraDirection(cam);
	return (worldPoint: Vector3): boolean => {
		const relPoint = Vec3.subtract(worldPoint, camPosition);
		return Vec3.dot(relPoint, forward) > 0;
	};
};


//returns [fx, fy], imagine going 1 unit in the forward direction
//now go fx units in the right direction and fy units in the up direction
//this point now projects to the top-right corner of the screen
export function calculateFrustumSize(cam: PerspectiveCamera): Vector2 {
	const { settings } = cam;
	return Vec2.divide([settings.planeWidthHalf, settings.planeHeightHalf] as Vector2, settings.zScale)
}

//how much back do we have to move the frustum to create a space between the two that 
//a sphere of radius = padding can perfectly fit in?
//the return value is actually positive for positive padding, it's the relative offset of 
//a point that is to be checked if inside the new frustum 
export function calculateFrustumPaddingOffset(frustum: Vector2, padding: number): number {
	const offset1 = Math.hypot(1, frustum[0]) / frustum[0];
	const offset2 = Math.hypot(1, frustum[1]) / frustum[1];
	return padding * Math.max(offset1, offset2);
}

export const isPointInsideFrustum = (frustumSize: Vector2, camSpacePoint: Vector3): boolean => {
	if (camSpacePoint[2] < 0) return false;
	const [w, h] = Vec2.multiply(frustumSize, camSpacePoint[2]);
	const [x, y] = [camSpacePoint[0], camSpacePoint[1]];
	return x < w && x > -w && y < h && y > -h;
}

function calculateFrustumBorderIntersection(vectorIndex: number, frustumSize: Vector2, p: Vector3, v: Vector3): Option<number> {
	const i = vectorIndex;
	const denom = (v[i] - v[2] * frustumSize[i]);
	if (denom === 0) return none;
	return some((p[2] * frustumSize[i] - p[i]) / denom);
}
export function calculateFrustumLineIntersection(frustumSize: Vector2, camSpaceLine: [Vector3, Vector3]): Option<number> {
	const p = camSpaceLine[0];
	const v = Vec3.subtract(camSpaceLine[1], camSpaceLine[0]);
	const ts = [0, 1].map(i => calculateFrustumBorderIntersection(i, frustumSize, p, v));
	let t: Option<number> = none;
	for (const ct of ts){
		if (isNone(ct) || ct.value < 0 || ct.value > 1) continue;
		if (isNone(t) || ct.value < t.value){
			t = ct;
		}
	}
	return t;
}