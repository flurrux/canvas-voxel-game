import { Matrix3, Vector3 } from './types';
import { inverse as inverseMatrix, multiplyVector, multiplyMatrix } from './mat3x3';
import * as Vec3 from './vec3';

export interface Transform {
    position: Vector3,
    orientation: Matrix3
};
export const transformPoint = (transform: Transform) => {
    return (point: Vector3) : Vector3 => {
		return Vec3.add(transform.position, multiplyVector(transform.orientation, point));
	}
};
export const transformDirection = (transform: Transform) => {
	return (direction: Vector3): Vector3 => {
		return multiplyVector(transform.orientation, direction);
	};
};
export const inverseTransformPoint = (transform: Transform) => {
    const invMat = inverseMatrix(transform.orientation);
    return (point: Vector3) : Vector3 => multiplyVector(invMat, Vec3.subtract(point, transform.position));
};
export const inverseTransformDirection = (transform: Transform) => {
	const invMat = inverseMatrix(transform.orientation);
	return (direction: Vector3): Vector3 => multiplyVector(invMat, direction);
};
export const transformTransform = (transform: Transform) => {
    return (toTransform: Transform) => {
        const pointTransform = transformPoint(transform);
        return {
            position: pointTransform(toTransform.position),
            orientation: multiplyMatrix(transform.orientation, toTransform.orientation)
        }
    };
};
export const inverseTransformTransform = (transform: Transform) => {
    const inversePointTransform = inverseTransformPoint(transform);
    const inverseOrientation = inverseMatrix(transform.orientation);
    return (toTransform: Transform) => {
        return {
            position: inversePointTransform(toTransform.position),
            orientation: multiplyMatrix(inverseOrientation, toTransform.orientation)
        }
    }
};