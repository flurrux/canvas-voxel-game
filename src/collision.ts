import { Vector3 } from '../lib/types';
import * as Vec3 from '../lib/vec3';
import { FreeCamera, setCameraPosition } from './free-camera';
import { setY, setYZero } from './util';


//falling ###

export function updateFallState(camera: FreeCamera, voxels: Vector3[]): FreeCamera {
	const camPosition = camera.transform.position;
	const camBottomY = camPosition[1] - camera.height;
	const camBottomPosition = [camPosition[0], camBottomY, camPosition[2]] as Vector3;
	const verticalLevel = findVerticalLevel(camBottomPosition, voxels);
	if (camera.isFalling) {
		if (camera.fallVelocity <= 0 && verticalLevel >= camBottomY) {
			return {
				...camera,
				isFalling: false,
				fallVelocity: 0,
				transform: {
					...camera.transform,
					position: setY(verticalLevel + camera.height)(camPosition)
				}
			}
		}
	}
	else {
		if (verticalLevel < camBottomY) {
			return {
				...camera,
				isFalling: true,
			}
		}
	}
	return camera;
}
function findVerticalLevel(position: Vector3, voxels: Vector3[]): number {
	const x = Math.round(position[0]);
	const z = Math.round(position[2]);
	const y = position[1];
	let curLevel = -0.5;
	for (const voxel of voxels) {
		if (voxel[0] !== x || voxel[2] !== z) continue;
		const surfaceY = voxel[1] + 0.5;
		if (surfaceY > y + 1 || surfaceY < curLevel) continue;
		curLevel = surfaceY;
	}
	return curLevel;
}


//horizontal collision 

type RelativeIntersectedCell = [-1, 0, 0] | [1, 0, 0] | [0, 0, -1] | [0, 0, 1] | [-1, 0, -1] | [1, 0, -1] | [-1, 0, 1] | [1, 0, 1];
const allNeighbourCells: RelativeIntersectedCell[] = [
	[-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1], [-1, 0, -1], [1, 0, -1], [-1, 0, 1], [1, 0, 1]
];

function getRelativeIntersectedCells(position: Vector3, radius: number): RelativeIntersectedCell[] {
	const inCellPosition = Vec3.subtract(position, Vec3.round(position));
	const cells: RelativeIntersectedCell[] = [];
	const availableSpace = 0.5 - radius;
	//edge-cells should be handled first
	for (let i = 0; i < 4; i++) {
		const cell = allNeighbourCells[i];
		if (Vec3.dot(inCellPosition, cell) <= availableSpace) continue;
		cells.push(cell);
	}
	//corner cells
	for (let j = 4; j < 8; j++) {
		const cell = allNeighbourCells[j];
		const corner = Vec3.multiply(cell, 0.5);
		if (Vec3.distance(corner, inCellPosition) >= radius) continue;
		cells.push(cell);
	}
	return cells;
}
function depenetrateFromCell(inCellPosition: Vector3, radius: number, cell: RelativeIntersectedCell): Vector3 {
	if (Vec3.sqrdMagnitude(cell) === 1) {
		const depScale = -Vec3.dot(inCellPosition, cell) + 0.5 - radius;
		if (depScale >= 0) return inCellPosition;
		const depVector = Vec3.multiply(cell, depScale);
		return Vec3.add(inCellPosition, depVector);
	}
	else {
		const corner = Vec3.multiply(cell, 0.5);
		const vecFromCorner = Vec3.subtract(inCellPosition, corner);
		if (Vec3.magnitude(vecFromCorner) >= radius) return inCellPosition;
		return Vec3.add(corner, Vec3.multiply(Vec3.normalize(vecFromCorner), radius));
	}
}
function depenetrateFromCells(position: Vector3, radius: number, cells: RelativeIntersectedCell[]): Vector3 {
	const roundedPosition = Vec3.round(position);
	let inCellPosition = Vec3.subtract(position, roundedPosition);
	for (const cell of cells) {
		inCellPosition = depenetrateFromCell(inCellPosition, radius, cell);
	}
	return Vec3.add(roundedPosition, inCellPosition);
}
function findCollisionCells(position: Vector3, height: number, radius: number, voxels: Vector3[]): RelativeIntersectedCell[] {
	const relCells = getRelativeIntersectedCells(position, radius);
	const positionR = Vec3.round(position);
	//add a small offset so that when walking on voxels, we don't get stuck on the surface
	const bottomY = Math.round(position[1] - height + 0.05);
	const topY = Math.round(position[1]);
	let collisionCells: RelativeIntersectedCell[] = [];
	for (const voxel of voxels) {
		if (voxel[1] < bottomY || voxel[1] > topY) continue;
		const relVoxel = Vec3.subtract(voxel, positionR);
		if (Math.abs(relVoxel[0]) > 1 || Math.abs(relVoxel[2]) > 1) continue;
		const relVoxelFlat = setYZero(relVoxel);
		for (const relCell of relCells) {
			if (!Vec3.equal(relVoxelFlat, relCell)) continue;
			if (collisionCells.some(cell => Vec3.equal(cell, relCell))) continue;
			collisionCells.push(relCell);
		}
	}
	return collisionCells;
}
function performDepentration(position: Vector3, height: number, radius: number, voxels: Vector3[]): Vector3 {
	return depenetrateFromCells(
		position, radius,
		findCollisionCells(position, height, radius, voxels)
	);
}
export const performDepentrationByCamera = (radius: number, voxels: Vector3[]) => (camera: FreeCamera): FreeCamera => {
	return setCameraPosition(
		performDepentration(camera.transform.position, camera.height, radius, voxels)
	)(camera)
};