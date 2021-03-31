import { filter, flatten } from 'fp-ts/lib/Array';
import { not, pipe } from 'fp-ts/lib/function';
import { isNone, Option } from 'fp-ts/lib/Option';
import { Transformation, Vector3 } from '../lib/types';
import * as Vec3 from '../lib/vec3';
import { toPerspectiveCam, updateCameraLocomotion } from './camera/first-person-camera';
import { handlePlayerCollision } from './voxel/player-collision';
import { setupControls } from './controls';
import { frustumCullVoxels, isVoxelBehindCamera } from './voxel/frustum-culling';
import { setupFullscreenControl } from './fullscreen-button';
import { createDefaultGameState, GameState } from './game-state';
import { createVoxelArraySortFunctionWithCamPosition } from './voxel/occlusion-sorting';
import { loadSavedGame, setupSaving } from './persistence';
import { performGazeRaycast, RaycastResult } from './voxel/raycasting';
import { PerspectiveCamera } from './camera/perspective-camera';
import { renderStars } from './sky';
import { worldPointToCamPoint, worldPointToScreenPoint } from './space-conversion';
import { adjustCanvasSizeToWindow, flattenY, mapRange, removeEnclosedVoxels, startLoop } from './util';
import { projectVoxelFace, projectVoxelFaces, renderVoxelProjections } from './voxel/rendering';
import { createSphereVoxels } from './voxel/shapes';
import { pathPolygon } from '../lib/ctx-util';

//ideas:
//3d visualization of occlusion order


//setup canvas ###

const canvas = document.body.querySelector("canvas");
const ctx = canvas.getContext("2d");

const onresize = () => {
	adjustCanvasSizeToWindow(canvas);
	const screenSize = (window.innerWidth + window.innerHeight) / 2;
	const targetPlaneSize = mapRange([700, 1200], [2.5, 3], screenSize);
	const planeScale = targetPlaneSize / (2 * Math.min(canvas.offsetWidth, canvas.offsetHeight));
	setStateAndRender({
		...state,
		camera: {
			...state.camera,
			perspectiveSettings: {
				zScale: 2,
				planeWidthHalf: canvas.offsetWidth * planeScale,
				planeHeightHalf: canvas.offsetHeight * planeScale
			}
		}
	});
};
window.onresize = onresize;


//state & settings ###

const backgroundColor = "rgb(24, 26, 27)";

let state: GameState = createDefaultGameState(ctx);

function transformStateAndRender(transformation: Transformation<GameState>){
	setStateAndRender(transformation(state));
}
function setStateAndRender(newState: GameState){
	state = {
		...newState, 
		renderRequested: true
	}
}


//render ###

function requestRender() {
	state = { ...state, renderRequested: true };
}
function resetRenderRequests(state: GameState): GameState {
	return { ...state, renderRequested: false };
}

function renderHorizon(ctx: CanvasRenderingContext2D, camera: PerspectiveCamera){
	const camPos = camera.transform.position;
	const mat = camera.transform.orientation;
	const right = mat.slice(0, 3) as Vector3;
	const forward = flattenY(mat.slice(6) as Vector3);
	const v1 = Vec3.multiply(forward, 1000);
	const v2 = Vec3.multiply(right, 1800);
	const horizonPoints: Vector3[] = [
		Vec3.add(camPos, Vec3.add(v1, v2)),
		Vec3.add(camPos, Vec3.subtract(v1, v2)),
	];
	const screenPoints = horizonPoints.map(
		worldPointToScreenPoint(ctx, camera)
	);
	ctx.save();
	Object.assign(ctx, {
		lineWidth: 2,
		lineJoin: "round",
		strokeStyle: "#acacad",
		globalAlpha: 0.4
	});
	ctx.beginPath();
	ctx.moveTo(...screenPoints[0]);
	ctx.lineTo(...screenPoints[1]);
	ctx.stroke();
	ctx.restore();
}
function renderGazeIntersection(ctx: CanvasRenderingContext2D, camera: PerspectiveCamera, intersection: Option<RaycastResult>){
	if (isNone(intersection)) return;
	const isec = intersection.value;
	const isecPolyOpt = projectVoxelFace(ctx, camera, isec.voxel, isec.faceNormal);
	if (isNone(isecPolyOpt)) return;
	const isecPoly = isecPolyOpt.value;
	
	ctx.save();
	Object.assign(ctx, {
		lineWidth: 3,
		lineJoin: "round",
		strokeStyle: "red",
		globalAlpha: 0.5
	});
	pathPolygon(ctx, isecPoly);
	ctx.stroke();
	ctx.restore();
}
function renderCrossHair(ctx: CanvasRenderingContext2D){
	ctx.save();
	ctx.beginPath();
	ctx.arc(0, 0, 3, 0, 2 * Math.PI);
	ctx.fillStyle = "white";
	ctx.globalAlpha = 0.5;
	ctx.fill();
	ctx.restore();
}

const sortVoxels = createVoxelArraySortFunctionWithCamPosition<Vector3>(3);
function renderVoxels(ctx: CanvasRenderingContext2D, camera: PerspectiveCamera, voxels: Vector3[]){
	const visibleVoxels = pipe(
		voxels,
		filter(not(isVoxelBehindCamera(camera))),
		frustumCullVoxels(camera, worldPointToCamPoint(camera))
	);
	const sortedVoxels = sortVoxels(camera.transform.position, visibleVoxels);
	const screenPolygons = flatten(sortedVoxels.map(projectVoxelFaces(ctx, camera)));
	renderVoxelProjections(ctx, screenPolygons);
}
function renderFpsCounter(ctx: CanvasRenderingContext2D, fps: number){
	const canvas = ctx.canvas;
	ctx.save();
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.translate(-80, -25);
	ctx.scale(1, -1);
	Object.assign(ctx, {
		fillStyle: "white", 
		font: "20px sans-serif", 
		globalAlpha: 0.6
	});
	ctx.fillText(`fps: ${fps}`, 0, 0);
	ctx.restore();
}

const render = (ctx: CanvasRenderingContext2D, state: GameState) => {
    
	const { canvas } = ctx;
	const [w, h] = [canvas.width, canvas.height];
	const { stars, currentRayIntersection } = state;
	const camera = state.currentBakedCamera;

	ctx.save();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
	ctx.scale(window.devicePixelRatio, -window.devicePixelRatio);
	
	renderHorizon(ctx, camera);
	renderStars(ctx, camera, stars);
	renderVoxels(ctx, camera, state.preFilteredVoxels);	
	renderGazeIntersection(ctx, camera, currentRayIntersection);
	renderCrossHair(ctx);
	renderFpsCounter(ctx, state.fps);

    ctx.restore();
};


//update ###

function deltaTimeToFps(dt: number): number {
	return Math.round(1 / dt);
}
function update(dt: number, state: GameState): GameState {
	const { camera, voxels } = state;
	const updatedCamera = pipe(
		camera,
		updateCameraLocomotion(dt),
		handlePlayerCollision(voxels)
	);
	return {
		...state, 
		camera: updatedCamera,
		currentBakedCamera: toPerspectiveCam(updatedCamera),
		currentRayIntersection: performGazeRaycast(state.currentBakedCamera, voxels)
	}
}
function needsUpdate(state: GameState): boolean {
	const { camera, renderRequested } = state;
	return renderRequested || !Vec3.isZero(camera.walkVelocity) || camera.isFalling;
}
function onLoop(dt: number){
	if (!needsUpdate(state)) return;
	state = update(dt, state);
	state = { ...state, fps: deltaTimeToFps(dt) };
	render(ctx, state);
	state = resetRenderRequests(state);
}

function updatePrefilteredVoxels(state: GameState): GameState {
	return { ...state, preFilteredVoxels: removeEnclosedVoxels(state.voxels) };
}

function addTestVoxels(state: GameState): GameState {
	return {
		...state, 
		voxels: createSphereVoxels(8)
	}
}

const main = () => {
	state = pipe(
		state, 
		loadSavedGame,
		// addTestVoxels,
		updatePrefilteredVoxels
	);
	setupSaving(() => state);
    onresize();
	setupFullscreenControl("#fullscreen-button");
	setupControls(canvas, transformStateAndRender);
	requestRender();
	startLoop(onLoop);
};

main();