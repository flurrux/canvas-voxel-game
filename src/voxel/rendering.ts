import { map as mapArray } from "fp-ts/lib/Array";
import { pipe } from "fp-ts/lib/function";
import { isNone, none, Option, some } from "fp-ts/lib/Option";
import { multiplyVector } from "../../lib/mat3x3";
import { Vector2, Vector3 } from "../../lib/types";
import * as Vec3 from "../../lib/vec3";
import { PerspectiveCamera, projectPoints } from "../camera/perspective-camera";
import { normalize } from "../util";
import { VoxelFaceNormal, voxelFaceNormals } from './voxel-face';
import { viewportToCanvas } from "../space-conversion";
import { pathPolygon } from "../../lib/ctx-util";
import { Camera } from "../camera/camera";

export function getOrthogonalAxes(normal: VoxelFaceNormal): [Vector3, Vector3] {
	if (normal[0] === +1) return [[0, 0, 1], [0, 1, 0]];
	if (normal[0] === -1) return [[0, 0, -1], [0, 1, 0]];
	if (normal[1] === +1) return [[1, 0, 0], [0, 0, 1]];
	if (normal[1] === -1) return [[1, 0, 0], [0, 0, -1]];
	if (normal[2] === +1) return [[1, 0, 0], [0, 1, 0]];
	if (normal[2] === -1) return [[1, 0, 0], [0, -1, 0]];
}

const localFaceVertices: Vector2[] = [
	[+0.5, +0.5],
	[-0.5, +0.5],
	[-0.5, -0.5],
	[+0.5, -0.5]
];

type ScreenQuad = [Vector2, Vector2, Vector2, Vector2];

function cutPolygonPartInBack(minZ: number, camSpacePolygon: Vector3[]): Vector3[] {
	let result: Vector3[] = [];
	for (let i = 0; i < camSpacePolygon.length; i++){
		const p1 = camSpacePolygon[i];
		const p2 = camSpacePolygon[(i + 1) % camSpacePolygon.length];
		const [z1, z2] = [p1[2], p2[2]];
		if (z1 >= minZ){
			result.push(p1);
		}
		if ((z1 < minZ && z2 > minZ) || z1 > minZ && z2 < minZ){
			const t = normalize(z1, z2, minZ);
			result.push(Vec3.interpolate(p1, p2, t));
		}
	}
	return result;
}

function cutPolygonPartInBackIfClose(
	minDistanceSqrd: number, minZ: number, 
	camSpaceVoxel: Vector3, camSpacePolygon: Vector3[]): Vector3[] {
	
	if (Vec3.sqrdMagnitude(camSpaceVoxel) > minDistanceSqrd) return camSpacePolygon;
	return cutPolygonPartInBack(minZ, camSpacePolygon);
}


const isVoxelNormalFacingCamera = (cam: Camera, voxel: Vector3) => {
	const relCamPosition = Vec3.subtract(cam.transform.position, voxel);
	return (faceNormal: VoxelFaceNormal): boolean => {
		return Vec3.dot(
			Vec3.subtract(
				relCamPosition, 
				Vec3.multiply(faceNormal, 0.5)
			), 
			faceNormal
		) > 0;
	};
};

export function getVisibleFaceNormals(cam: Camera, voxel: Vector3): VoxelFaceNormal[] {
	return voxelFaceNormals.filter(isVoxelNormalFacingCamera(cam, voxel));
}

export function projectVoxelFace(
	ctx: CanvasRenderingContext2D, cam: PerspectiveCamera, voxel: Vector3, faceNormal: VoxelFaceNormal): Option<ScreenQuad> {
	
	const camPosition = cam.transform.position;
	const facePosition = Vec3.add(voxel, Vec3.multiply(faceNormal, 0.5));
	const camPositionDot = Vec3.dot(
		Vec3.subtract(camPosition, facePosition), faceNormal
	);
	//voxel-face is not facing the camera
	if (camPositionDot <= 0) return none;
	const { inverseMatrix } = cam;
	const localFacePosition = multiplyVector(inverseMatrix, Vec3.subtract(facePosition, camPosition));
	const faceAxes = getOrthogonalAxes(faceNormal).map(
		axis => multiplyVector(inverseMatrix, axis)
	);
	const camFaceVertices = localFaceVertices.map(
		vert => Vec3.add(
			localFacePosition, 
			Vec3.add(
				Vec3.multiply(faceAxes[0], vert[0]), 
				Vec3.multiply(faceAxes[1], vert[1]),
			)
		)
	);
	// const culledVertices = cutPolygonPartInBackIfClose(8, 0.3, localFacePosition, camFaceVertices);
	const culledVertices = cutPolygonPartInBack(0.5, camFaceVertices);
	if (culledVertices.length < 3) return none;
	const screenVertices = pipe(
		culledVertices,
		projectPoints(cam.settings),
		mapArray(viewportToCanvas(ctx))
	) as ScreenQuad;
	return some(screenVertices);
}

export const projectVoxelFaces = (ctx: CanvasRenderingContext2D, cam: PerspectiveCamera) => (voxel: Vector3): ScreenQuad[] => {
	const projectedFaces: ScreenQuad[] = [];
	for (const normal of voxelFaceNormals){
		const curProjection = projectVoxelFace(ctx, cam, voxel, normal);
		if (isNone(curProjection)) continue;
		projectedFaces.push(curProjection.value);
	}
	return projectedFaces;
};

export function renderScreenQuad(ctx: CanvasRenderingContext2D, screenPolygon: ScreenQuad) {
	pathPolygon(ctx, screenPolygon);
	ctx.fill();
	ctx.stroke();
}

export function renderVoxelProjections(ctx: CanvasRenderingContext2D, screenPolygons: ScreenQuad[]){
	ctx.save();
	Object.assign(ctx, {
		lineWidth: 3,
		lineJoin: "round",
		strokeStyle: "#acacad",
		fillStyle: "rgb(24, 26, 27)"
	});
	for (const screenPolygon of screenPolygons){
		renderScreenQuad(ctx, screenPolygon);
	}
	ctx.restore();
}