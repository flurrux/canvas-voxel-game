import { multiplyVector } from '../../lib/mat3x3';
import { Transform } from '../../lib/transform';
import { Vector3, Matrix3 } from '../../lib/types';
import * as Vec3 from '../../lib/vec3';

export interface Camera {
	transform: Transform,
	inverseMatrix: Matrix3,
}

export const toCamSpace = (cam: Camera) => (worldPoint: Vector3): Vector3 => {
	return multiplyVector(
		cam.inverseMatrix, 
		Vec3.subtract(worldPoint, cam.transform.position)
	) 
};