import { Morphism, Vector3 } from "../lib/types";
import { FirstPersonCamera } from "./camera/first-person-camera";
import { GameState } from "./game-state";
import { Star } from "./sky";

const persistenceKey: string = "voxel-canvas-state";

type PersistedState = {
	voxels: Vector3[],
	camera: FirstPersonCamera, 
	stars: Star[]
};

export function loadSavedGame(state: GameState): GameState {
	const stateStr = window.localStorage.getItem(persistenceKey);
	if (!stateStr) return state;
	const toLoad = JSON.parse(stateStr) as PersistedState;
	return { 
		...state, 
		...toLoad
	};
}

export function setupSaving(getState: Morphism<void, GameState>) {
	window.onbeforeunload = () => {
		const state = getState();
		const toSave: PersistedState = {
			camera: state.camera,
			voxels: state.voxels, 
			stars: state.stars
		};
		localStorage.setItem(persistenceKey, JSON.stringify(toSave));
	};
}