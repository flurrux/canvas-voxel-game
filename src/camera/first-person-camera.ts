import { inverse, multiplyMatrix, multiplyVector, rotation } from "../../lib/mat3x3";
import { Matrix3, Vector2, Vector3 } from "../../lib/types";
import { CameraSettings, PerspectiveCamera } from "./perspective-camera";
import { flattenY, setYZero } from "../util";
import * as Vec3 from '../../lib/vec3';

export type FirstPersonCamera = {
	gravity: number,
	colliderRadius: number,
	walkVelocity: Vector3,
	isFalling: boolean,
	fallVelocity: Vector3,
	height: number,
	rotation: Vector2,
	feetPosition: Vector3, 
	perspectiveSettings: CameraSettings
};

export const setWalkVelocity = (newVelocity: Vector3) => (camera: FirstPersonCamera): FirstPersonCamera => {
	return {
		...camera,
		walkVelocity: newVelocity
	}
};
export const setCameraPosition = (newPosition: Vector3) => (camera: FirstPersonCamera): FirstPersonCamera => {
	return {
		...camera,
		feetPosition: newPosition
	}
};

function calculateOrientation(freeCam: FirstPersonCamera): Matrix3 {
	const rotationMatrix1 = rotation([0, freeCam.rotation[0], 0]);
	const rotationMatrix2 = rotation([freeCam.rotation[1], 0, 0]);
	return multiplyMatrix(rotationMatrix1, rotationMatrix2);
}

function calculateHeadPosition(freeCam: FirstPersonCamera){
	return Vec3.add(freeCam.feetPosition, [0, freeCam.height, 0])
}

export function toPerspectiveCam(freeCam: FirstPersonCamera): PerspectiveCamera {
	const orientation = calculateOrientation(freeCam);
	const inverseMatrix = inverse(orientation);
	return {
		settings: freeCam.perspectiveSettings,
		transform: {
			position: calculateHeadPosition(freeCam),
			orientation
		},
		inverseMatrix
	}
}

function calculateGlobalWalkVelocity(orientation: Matrix3, localWalkVelocity: Vector3): Vector3 {
	const forward = orientation.slice(6) as Vector3;
	if (Vec3.isZero(forward)) return [0, 0, 0];
	const flatForward = flattenY(forward);
	const flatOrientation = [
		...orientation.slice(0, 3),
		0, 1, 0, 
		...flatForward
	] as Matrix3;
	return multiplyVector(flatOrientation, localWalkVelocity);
}

export const updateCameraLocomotion = (dt: number) => (camera: FirstPersonCamera): FirstPersonCamera => {
	const orientation = calculateOrientation(camera);
	const globalWalkVelocity = calculateGlobalWalkVelocity(orientation, camera.walkVelocity);
	const globalVelocity = Vec3.add(globalWalkVelocity, camera.fallVelocity);
	const curPosition = camera.feetPosition;
	let nextPosition = Vec3.add(curPosition, Vec3.multiply(globalVelocity, dt));
	camera = {
		...camera,
		fallVelocity: camera.isFalling ? Vec3.add(camera.fallVelocity, [0, camera.gravity * dt, 0]) : [0, 0, 0],
		feetPosition: nextPosition
	};
	return camera;
};