import { Vector3 } from "../lib/types";
import { FreeCamera } from "./camera/free-camera";
import { GameState } from "./game-state";
import { Star } from "./sky";
import { Morphism } from "./util";

const persistenceKey: string = "voxel-canvas-state";

type PersistedState = {
	voxels: Vector3[],
	camera: FreeCamera, 
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