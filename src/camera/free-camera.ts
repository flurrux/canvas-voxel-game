import { inverse, multiplyMatrix, multiplyVector, rotation } from "../../lib/mat3x3";
import { Vector2, Vector3 } from "../../lib/types";
import { PerspectiveCamera } from "./perspective-camera";
import { setYZero } from "../util";
import * as Vec3 from '../../lib/vec3';
import { updateFallState } from "../collision";

export type FreeCamera = {
	walkVelocity: Vector3,
	isFalling: boolean,
	fallVelocity: number,
	height: number,
	rotation: Vector2,
} & PerspectiveCamera;

export const setWalkVelocity = (newVelocity: Vector3) => (camera: FreeCamera): FreeCamera => {
	return {
		...camera,
		walkVelocity: newVelocity
	}
};
export const setCameraPosition = (newPosition: Vector3) => (camera: FreeCamera): FreeCamera => {
	return {
		...camera,
		transform: {
			...camera.transform,
			position: newPosition
		}
	}
};

export const updateCamera = (dt: number, voxels: Vector3[]) => (camera: FreeCamera): FreeCamera => {
	const rotationMatrix1 = rotation([0, camera.rotation[0], 0]);
	const rotationMatrix2 = rotation([camera.rotation[1], 0, 0]);
	const orientation = multiplyMatrix(rotationMatrix1, rotationMatrix2);
	const inverseMatrix = inverse(orientation);
	let globalWalkVelocity = Vec3.normalize(
		setYZero(
			multiplyVector(orientation, camera.walkVelocity)
		)
	);
	const walkSpeed = 6;
	const gravity = -20;
	const globalVelocity = Vec3.add(Vec3.multiply(globalWalkVelocity, walkSpeed), [0, camera.fallVelocity, 0]);
	const curPosition = camera.transform.position;
	let nextPosition = Vec3.add(curPosition, Vec3.multiply(globalVelocity, dt));
	camera = {
		...camera,
		inverseMatrix,
		fallVelocity: camera.fallVelocity + (camera.isFalling ? gravity * dt : 0),
		transform: {
			...camera.transform,
			position: nextPosition,
			orientation
		}
	};
	camera = updateFallState(camera, voxels);
	return camera;
};