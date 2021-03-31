import { none, Option } from 'fp-ts/lib/Option';
import { identity } from '../lib/mat3x3';
import { Vector3 } from '../lib/types';
import { FreeCamera, toPerspectiveCam } from './camera/free-camera';
import { RaycastResult } from './raycasting';
import { createCamSettingsFromCanvas, PerspectiveCamera } from './camera/perspective-camera';
import { createRandomStars, Star } from './sky';

export type GameState = {
	camera: FreeCamera,
	currentBakedCamera: PerspectiveCamera,
	currentRayIntersection: Option<RaycastResult>,
	renderRequested: boolean,
	voxels: Vector3[],
	preFilteredVoxels: Vector3[],
	stars: Star[],
	fps: number
};

export const createDefaultGameState = (ctx: CanvasRenderingContext2D): GameState => {
	const defaultCamera: FreeCamera = {
		walkVelocity: [0, 0, 0],
		isFalling: false,
		fallVelocity: 0,
		height: 1.7,
		rotation: [0, 0],
		feetPosition: [0, -0.5, -5],
		perspectiveSettings: createCamSettingsFromCanvas(2, 0.003, ctx.canvas),
	};
	return {
		camera: defaultCamera, 
		currentBakedCamera: toPerspectiveCam(defaultCamera),
		currentRayIntersection: none,
		renderRequested: false,
		voxels: [],
		preFilteredVoxels: [],
		stars: createRandomStars(1000),
		fps: -1,
	}
};