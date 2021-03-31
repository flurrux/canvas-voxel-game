import { inverse, multiplyMatrix, multiplyVector, rotation } from "../../lib/mat3x3";
import { Matrix3, Vector2, Vector3 } from "../../lib/types";
import { CameraSettings, PerspectiveCamera } from "./perspective-camera";
import { setYZero } from "../util";
import * as Vec3 from '../../lib/vec3';

export type FirstPersonCamera = {
	gravity: number,
	colliderRadius: number,
	walkVelocity: Vector3,
	isFalling: boolean,
	fallVelocity: number,
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

export const updateCameraLocomotion = (dt: number) => (camera: FirstPersonCamera): FirstPersonCamera => {
	const orientation = calculateOrientation(camera);
	let globalWalkVelocity = setYZero(multiplyVector(orientation, camera.walkVelocity));
	// const walkSpeed = 6;
	const globalVelocity = Vec3.add(globalWalkVelocity, [0, camera.fallVelocity, 0]);
	const curPosition = camera.feetPosition;
	let nextPosition = Vec3.add(curPosition, Vec3.multiply(globalVelocity, dt));
	camera = {
		...camera,
		fallVelocity: camera.fallVelocity + (camera.isFalling ? camera.gravity * dt : 0),
		feetPosition: nextPosition
	};
	return camera;
};