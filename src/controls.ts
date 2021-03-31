import { flow, pipe } from "fp-ts/lib/function";
import { map } from "fp-ts/lib/Array";
import { isNone } from "fp-ts/lib/Option";
import { Morphism, Transformation, Vector3 } from "../lib/types";
import * as Vec2 from '../lib/vec2';
import * as Vec3 from '../lib/vec3';
import { FirstPersonCamera, setWalkVelocity } from "./camera/first-person-camera";
import { GameState } from "./game-state";
import { removeEnclosedVoxels } from "./util";

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

function setupJumpControl(transformState: StateTransformApplication) {
	const jumpForce = 7;
	const transformCam = flow(transformCameraInState, transformState);
	document.addEventListener("keydown", e => {
		if (e.code !== "Space") return;
		transformCam(
			cam => {
				if (cam.isFalling) return cam;
				return {
					...cam, 
					isFalling: true, 
					fallVelocity: jumpForce
				}
			}
		)
	});
}

export function setupControls(canvas: HTMLCanvasElement, transformState: StateTransformApplication) {
	setupPointerControl(canvas, transformState);
	setupCameraControl(canvas, transformState);
	setupWalkControl(transformState);
	setupJumpControl(transformState);
}