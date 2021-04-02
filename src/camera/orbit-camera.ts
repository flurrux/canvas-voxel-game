import { inverse, multiplyMatrix, rotation } from "../../lib/mat3x3";
import { Transform } from "../../lib/transform";
import { Matrix3, Vector3 } from "../../lib/types";
import { Camera } from "./camera";
import * as Vec3 from '../../lib/vec3';

export type OrbitCamera = {
	radius: number,
	latitude: number,
	longitude: number,
};

function calculateOrientation(orbitCam: OrbitCamera): Matrix3 {
	const rotationMatrix1 = rotation([0, orbitCam.longitude, 0]);
	const rotationMatrix2 = rotation([orbitCam.latitude, 0, 0]);
	return multiplyMatrix(rotationMatrix1, rotationMatrix2);
}

function calculateTransform(orbitCam: OrbitCamera): Transform {
	const orientation = calculateOrientation(orbitCam);
	const forward = orientation.slice(6) as Vector3;
	const position = Vec3.multiply(forward, -orbitCam.radius);
	return { position, orientation }
}

export function toRegularCamera(orbitCam: OrbitCamera): Camera {
	const transform = calculateTransform(orbitCam);
	return {
		transform, 
		inverseMatrix: inverse(transform.orientation)
	}
}