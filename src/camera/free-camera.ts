import { inverse, multiplyMatrix, multiplyVector, rotation } from "../../lib/mat3x3";
import { Matrix3, Vector2, Vector3 } from "../../lib/types";
import { CameraSettings, PerspectiveCamera } from "./perspective-camera";
import { setYZero } from "../util";
import * as Vec3 from '../../lib/vec3';
import { updateFallState } from "../collision";

export type FreeCamera = {
	walkVelocity: Vector3,
	isFalling: boolean,
	fallVelocity: number,
	height: number,
	rotation: Vector2,
	feetPosition: Vector3, 
	perspectiveSettings: CameraSettings
};

export const setWalkVelocity = (newVelocity: Vector3) => (camera: FreeCamera): FreeCamera => {
	return {
		...camera,
		walkVelocity: newVelocity
	}
};
export const setCameraPosition = (newPosition: Vector3) => (camera: FreeCamera): FreeCamera => {
	return {
		...camera,
		feetPosition: newPosition
	}
};

function calculateOrientation(freeCam: FreeCamera): Matrix3 {
	const rotationMatrix1 = rotation([0, freeCam.rotation[0], 0]);
	const rotationMatrix2 = rotation([freeCam.rotation[1], 0, 0]);
	return multiplyMatrix(rotationMatrix1, rotationMatrix2);
}

function calculateHeadPosition(freeCam: FreeCamera){
	return Vec3.add(freeCam.feetPosition, [0, freeCam.height, 0])
}

export function toPerspectiveCam(freeCam: FreeCamera): PerspectiveCamera {
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

export const updateCamera = (dt: number, voxels: Vector3[]) => (camera: FreeCamera): FreeCamera => {
	const orientation = calculateOrientation(camera);
	let globalWalkVelocity = Vec3.normalize(
		setYZero(
			multiplyVector(orientation, camera.walkVelocity)
		)
	);
	const walkSpeed = 6;
	const gravity = -20;
	const globalVelocity = Vec3.add(Vec3.multiply(globalWalkVelocity, walkSpeed), [0, camera.fallVelocity, 0]);
	const curPosition = camera.feetPosition;
	let nextPosition = Vec3.add(curPosition, Vec3.multiply(globalVelocity, dt));
	camera = {
		...camera,
		fallVelocity: camera.fallVelocity + (camera.isFalling ? gravity * dt : 0),
		feetPosition: nextPosition
	};
	camera = updateFallState(camera, voxels);
	return camera;
};