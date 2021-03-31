import { flow } from 'fp-ts/lib/function';
import { Vector2, Vector3 } from '../../lib/types';
import * as Vec3 from '../../lib/vec3';
import { FirstPersonCamera, setCameraPosition } from '../camera/first-person-camera';
import { setY, setYZero } from '../util';

//the ground level is at -0.5 so that voxels placed on the ground have a y coordinate of zero
const groundLevel = -0.5;

//falling ###

const updateFallState = (voxels: Vector3[]) => (camera: FirstPersonCamera): FirstPersonCamera => {
	const camPosition = camera.feetPosition;
	const camBottomY = camPosition[1];
	const camTopY = camBottomY + camera.height;
	const verticalLevels = findVerticalLevels(camPosition, camera.height, voxels);
	const { floor, ceiling } = verticalLevels; 
	if (camera.isFalling) {
		const fallVelocityY = camera.fallVelocity[1];
		if (fallVelocityY > 0 && ceiling < camTopY){
			return {
				...camera,
				isFalling: false,
				fallVelocity: [0, 0, 0],
				feetPosition: setY(ceiling - camera.height)(camPosition)
			}
		}
		if (fallVelocityY <= 0 && floor >= camBottomY) {
			return {
				...camera,
				isFalling: false,
				fallVelocity: [0, 0, 0],
				feetPosition: setY(floor)(camPosition)
			}
		}
	}
	else {
		if (floor < camBottomY) {
			return {
				...camera,
				isFalling: true,
			}
		}
	}
	return camera;
};

const isVoxelAtXZ = (x: number, z: number) => (voxel: Vector3): boolean => voxel[0] === x && voxel[2] === z;

//all the voxels with x and z components equal to the cameras
function findColumnVoxels(x: number, z: number, voxels: Vector3[]): Vector3[] {
	return voxels.filter(isVoxelAtXZ(Math.round(x), Math.round(z)));
}

function findCeilingLevel(headY: number, columnVoxels: Vector3[]): number {
	const headYRounded = Math.round(headY);
	let curLevel = 99999;
	for (const voxel of columnVoxels) {
		const voxelY = voxel[1];
		if (voxelY < headYRounded || voxelY > curLevel) continue;
		curLevel = voxelY
	}
	return curLevel - 0.5;
}

function findFloorLevel(feetY: number, columnVoxels: Vector3[]): number {
	const feetYRounded = Math.round(feetY);
	let curLevel = -1;
	for (const voxel of columnVoxels) {
		const voxelY = voxel[1];
		if (voxelY > feetYRounded || voxelY < curLevel) continue;
		curLevel = voxelY
	}
	return curLevel + 0.5;
}

function findVerticalLevels(feetPosition: Vector3, height: number, voxels: Vector3[]): { floor: number, ceiling: number } {
	const columnVoxels = findColumnVoxels(feetPosition[0], feetPosition[2], voxels);
	const feetY = feetPosition[1];
	const headY = feetY + height;
	return {
		floor: findFloorLevel(feetY, columnVoxels),
		ceiling: findCeilingLevel(headY, columnVoxels)
	}
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
	const bottomY = Math.round(position[1] + 0.05);
	const topY = Math.round(position[1] + height);
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
const performDepentrationByCamera = (voxels: Vector3[]) => (camera: FirstPersonCamera): FirstPersonCamera => {
	return setCameraPosition(
		performDepentration(camera.feetPosition, camera.height, camera.colliderRadius, voxels)
	)(camera)
};


export const handlePlayerCollision = (voxels: Vector3[]) => flow(
	updateFallState(voxels), 
	performDepentrationByCamera(voxels)
);