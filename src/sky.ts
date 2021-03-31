import { Morphism, Vector2, Vector3 } from "../lib/types";
import * as Vec3 from '../lib/vec3';
import { PerspectiveCamera } from "./camera/perspective-camera";
import { calculateFrustumSize, isPointInsideFrustum } from "./camera/frustum-culling";
import { camPointToScreenPoint, worldPointToCamPoint } from "./space-conversion";
import { createArray } from "./util";
import { drawDisc } from "../lib/ctx-util";


export type Star = {
	brightness: number, 
	position: Vector3
};

const randomPointOnUnitDome = (): Vector3 => {
	const latitude = -Math.acos(1 * Math.random() - 1) + Math.PI;
	const radius = Math.sin(latitude);
	const longitude = Math.random() * Math.PI * 2;
	return [
		Math.sin(longitude) * radius,
		Math.cos(latitude),
		Math.cos(longitude) * radius
	];
};

function createRandomStar(): Star {
	return {
		brightness: Math.random(),
		position: Vec3.multiply(randomPointOnUnitDome(), 10000)
	}
}

export function createRandomStars(count: number): Star[] {
	return createArray(count).map(createRandomStar);
}


const renderStar = (
	ctx: CanvasRenderingContext2D,
	worldToCamTransform: Morphism<Vector3, Vector3>,
	camToScreenTransform: Morphism<Vector3, Vector2>,
	frustumSize: Vector2) => (star: Star) => {

	const camSpacePosition = worldToCamTransform(star.position);
	if (!isPointInsideFrustum(frustumSize, camSpacePosition)) return;

	ctx.save();
	const screenPoint = camToScreenTransform(camSpacePosition);
	drawDisc(ctx, screenPoint, 1, { globalAlpha: star.brightness, fillStyle: "white" });
	ctx.restore();
};

export function renderStars(ctx: CanvasRenderingContext2D, camera: PerspectiveCamera, stars: Star[]) {
	stars.forEach(
		renderStar(
			ctx, worldPointToCamPoint(camera),
			camPointToScreenPoint(ctx, camera),
			calculateFrustumSize(camera)
		)
	);
}