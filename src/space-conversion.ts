import { flow } from 'fp-ts/lib/function';
import { multiplyVector } from '../lib/mat3x3';
import { Vector2, Vector3 } from '../lib/types';
import * as Vec3 from '../lib/vec3';
import { PerspectiveCamera, projectPoint, viewportToCanvas } from './camera/perspective-camera';


export const camPointToScreenPoint = (ctx: CanvasRenderingContext2D, camera: PerspectiveCamera) => (camPoint: Vector3): Vector2 => {
	return viewportToCanvas(ctx.canvas)(
		projectPoint(camera.settings)(
			camPoint
		)
	)
};
export const worldPointToCamPoint = (camera: PerspectiveCamera) => (worldPoint: Vector3): Vector3 => {
	return multiplyVector(
		camera.inverseMatrix,
		Vec3.subtract(worldPoint, camera.transform.position)
	)
};
export const worldPointToScreenPoint = (ctx: CanvasRenderingContext2D, camera: PerspectiveCamera) => flow(
	worldPointToCamPoint(camera),
	camPointToScreenPoint(ctx, camera)
);