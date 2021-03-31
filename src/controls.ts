import { flow, pipe } from "fp-ts/lib/function";
import { map } from "fp-ts/lib/Array";
import { isNone, none, Option, some } from "fp-ts/lib/Option";
import { Morphism, Transformation, Vector3 } from "../lib/types";
import * as Vec2 from '../lib/vec2';
import * as Vec3 from '../lib/vec3';
import { FirstPersonCamera, setWalkVelocity } from "./camera/first-person-camera";
import { GameState } from "./game-state";
import { removeEnclosedVoxels, setYZero } from "./util";

type StateTransform = Morphism<GameState, GameState>;
type StateTransformApplication = Morphism<StateTransform, void>;

function transformCameraInState(t: Transformation<FirstPersonCamera>): Transformation<GameState> {
	return (state) => ({
		...state, 
		camera: t(state.camera)
	})
}

function setupWalkControl(transformState: StateTransformApplication) {
	const walkSpeed = 6;

	let pressedLocomotionKeys: string[] = [];
	const locomotionKeys: string[] = ["w", "s", "a", "d"];
	const keyToVelocity = {
		"w": [0, 0, +1],
		"s": [0, 0, -1],
		"a": [-1, 0, 0],
		"d": [+1, 0, 0]
	}
	const getCurrentWalkVelocity = () => {
		return pipe(
			pressedLocomotionKeys, 
			map(key => keyToVelocity[key]), 
			Vec3.sum, 
			(v) => Vec3.multiply(v, walkSpeed)
		)
	};
	const updateWalkVelocity = () => {
		transformState(
			transformCameraInState(
				setWalkVelocity(getCurrentWalkVelocity())
			)
		)
	};
	document.addEventListener("keydown", e => {
		const key = e.key;
		if (!locomotionKeys.includes(key) || pressedLocomotionKeys.includes(key)) return;
		pressedLocomotionKeys = [...pressedLocomotionKeys, key];
		updateWalkVelocity();
	});
	document.addEventListener("keyup", e => {
		pressedLocomotionKeys = pressedLocomotionKeys.filter(key => key !== e.key);
		updateWalkVelocity();
	});
}

function setupPointerControl(canvas: HTMLCanvasElement, transformState: StateTransformApplication) {
	canvas.addEventListener("mousedown", (e) => {
		if (document.pointerLockElement !== canvas) {
			canvas.requestPointerLock();
			return;
		}
		return transformState(
			state => {
				const { currentRayIntersection, voxels } = state;
				if (isNone(currentRayIntersection)) return state;
				
				const isec = currentRayIntersection.value;
				let nextVoxels: Vector3[] = state.voxels;
				if (e.buttons === 1) {
					const newVoxel = Vec3.add(isec.voxel, isec.faceNormal);
					nextVoxels = [...voxels, newVoxel];
				}
				else if (e.buttons === 2) {
					nextVoxels = voxels.filter(v => !Vec3.equal(v, isec.voxel));
				}
				return {
					...state, voxels: nextVoxels, 
					preFilteredVoxels: removeEnclosedVoxels(nextVoxels)
				}
			}
		)
	});
}

function setupCameraControl(canvas: HTMLCanvasElement, transformState: StateTransformApplication) {
	const transformCam = flow(transformCameraInState, transformState);
	canvas.addEventListener("mousemove", e => {
		if (document.pointerLockElement !== canvas) return;
		transformCam(
			cam => ({
				...cam,
				rotation: Vec2.add(
					cam.rotation,
					Vec2.multiply([e.movementX, e.movementY], 0.005)
				)
			})
		)
	});
}

function startJump(cam: FirstPersonCamera): FirstPersonCamera {
	if (cam.isFalling) return cam;
	const jumpForce = 7;
	return {
		...cam,
		isFalling: true,
		fallVelocity: [0, jumpForce, 0]
	}
}
function setupJumpControl(transformState: StateTransformApplication) {
	const transformCam = flow(transformCameraInState, transformState);
	document.addEventListener("keydown", e => {
		if (e.code !== "Space") return;
		transformCam(startJump);
	});
}

function catapultPlayer(state: GameState): GameState {
	if (isNone(state.currentRayIntersection)) return state;
	const cam = state.camera;
	if (cam.isFalling) return state;
	const startPoint = cam.feetPosition;
	const targetPoint = Vec3.add(
		state.currentRayIntersection.value.voxel,
		[0, 0.5, 0]
	);
	const targetVector = Vec3.subtract(targetPoint, startPoint);
	const catapultDuration = Vec3.magnitude(targetVector) / 10;
	const diffY = targetVector[1];
	const initialVerticalVelocity = diffY / catapultDuration - 0.5 * cam.gravity * catapultDuration;
	const catapultVelocity: Vector3 = [
		targetVector[0] / catapultDuration, 
		initialVerticalVelocity,
		targetVector[2] / catapultDuration,
	];
	return {
		...state, 
		camera: {
			...cam, 
			isFalling: true,
			fallVelocity: catapultVelocity
		}
	}
}
function setupCatapultControl(transformState: StateTransformApplication){
	document.addEventListener("keydown", e => {
		if (e.key !== "j") return;
		transformState(catapultPlayer);
	});
}

export function setupControls(canvas: HTMLCanvasElement, transformState: StateTransformApplication) {
	setupPointerControl(canvas, transformState);
	setupCameraControl(canvas, transformState);
	setupWalkControl(transformState);
	setupJumpControl(transformState);
	setupCatapultControl(transformState);
}