import { filter, filterWithIndex, flatten, map, range } from 'fp-ts/lib/Array';
import { contramap, Eq } from 'fp-ts/lib/Eq';
import { difference, intersection, fromArray, toArray } from 'fp-ts/lib/Set';
import { min as minItem, max as maxItem, map as mapNEA } from 'fp-ts/lib/NonEmptyArray';
import { flow, not, pipe } from 'fp-ts/lib/function';
import { Morphism, Vector2, Vector3 } from '../lib/types';
import { OrbitCamera, toRegularCamera } from '../src/camera/orbit-camera';
import { createVoxelArraySortFunctionWithCamPosition } from '../src/voxel/occlusion-sorting';
import { isVoxelBehindCamera } from '../src/voxel/frustum-culling';
import { renderVoxelProjections, projectVoxelFaces, projectVoxelFace, getOrthogonalAxes } from '../src/voxel/rendering';
import { PerspectiveCamera } from '../src/camera/perspective-camera';
import { interpolate } from '../src/util';
import { drawDisc, pathPolygon, pathPolyline } from '../lib/ctx-util';
import * as Vec3 from '../lib/vec3';
import { getNonZeroIndex, VoxelFace, VoxelFaceNormal, voxelFaceNormals } from '../src/voxel/voxel-face';
import { isNone } from 'fp-ts/lib/Option';
import { worldPointToScreenPoint } from '../src/space-conversion';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { Ord, ordNumber } from 'fp-ts/lib/Ord';

//setup canvas ###

const canvas = document.body.querySelector("canvas");
const ctx = canvas.getContext("2d");
const updateCanvasSize = () => {
	const widthPx = window.innerWidth;
	const heightPx = window.innerHeight;
	const scalePx = window.devicePixelRatio || 1;
	Object.assign(canvas.style, {
		width: `${widthPx}px`,
		height: `${heightPx}px`
	});
	Object.assign(canvas, {
		width: widthPx * scalePx,
		height: heightPx * scalePx
	});
	// ctx.setTransform(scalePx, 0, 0, scalePx, 0, 0);
};

const onresize = () => {
	updateCanvasSize();
	camera = {
		...camera, 
		orthoSize: [canvas.width / 2, canvas.height / 2] as Vector2
	};
	render();
};
window.onresize = onresize;


//subspace stuff ###

type Sign = 1 | 0 | -1;
type SignPattern = [Sign, Sign, Sign];
type VoxelSubSpaceSlice = {
	signPattern: SignPattern, 
	value: number
};

const calculateSliceValue = (signPattern: SignPattern) => (point: Vector3): number => {
	let sum = 0;
	for (let i = 0; i < 3; i++) {
		sum += signPattern[i] * point[i];
	}
	return sum;
};

const isPointInSubSpace = (signPattern: SignPattern) => (point: Vector3): boolean => {
	for (let i = 0; i < 3; i++) {
		if (signPattern[i] !== Math.sign(point[i])) return false;
	}
	return true;
};

const isPointInSubSpaceSlice = (space: VoxelSubSpaceSlice) => (point: Vector3) => {
	const { signPattern } = space;
	return isPointInSubSpace(signPattern)(point) && calculateSliceValue(signPattern)(point) === space.value;
};

function getBoxVoxelsInSubSpaceSlice(boxSize: number, slice: VoxelSubSpaceSlice): FilledVoxel[] {
	return pipe(
		boxSize, 
		createBoxPoints,
		filter(isPointInSubSpaceSlice(slice)), 
		map(
			position => ({
				type: "filled",
				position,
				alpha: 0.8, 
				color: [255, 255, 255]
			} as FilledVoxel)
		)
	)
}


//camera ###

type OrthoOrbitCamera = OrbitCamera & { orthoSize: Vector2 };

let camera: OrthoOrbitCamera = {
	radius: 10, 
	latitude: 0, 
	longitude: 0,
	orthoSize: [1920, 1080]
};

//state & settings ###

const backgroundColor = "#d4d3d2";
let useOcclusion: boolean = true;

let lightDirection: Vector3 = Vec3.normalize([0.3, -1, -0.2])


//wire-voxel ###

type VoxelCorner = [1, 1, 1] | [-1, 1, 1] | [1, -1, 1] | [-1, -1, 1] | [1, 1, -1] | [-1, 1, -1] | [1, -1, -1] | [-1, -1, -1];

const voxelCorners: VoxelCorner[] = [
	[1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1]
];

const isEdgeAdjacentToCorner = (corner: VoxelCorner) => (edge: VoxelEdge): boolean => {
	for (let i = 0; i < 3; i++){
		if (edge[i] === 0) continue;
		if (Math.sign(edge[i]) !== Math.sign(corner[i])) return false;
	}
	return true;
};

function getEdgesAdjacentToCorner(corner: VoxelCorner): VoxelEdge[] {
	return voxelEdges.filter(isEdgeAdjacentToCorner(corner))
}

const isEdgeAdjacentToFace = (face: VoxelFaceNormal) => (edge: VoxelEdge): boolean => {
	const faceIndex = getNonZeroIndex(face);
	return Math.sign(edge[faceIndex]) === Math.sign(face[faceIndex]);
};

function getEdgesAdjacentToFace(faceNormal: VoxelFaceNormal): VoxelEdge[] {
	return voxelEdges.filter(isEdgeAdjacentToFace(faceNormal))
}


type VoxelEdge = [1, 1, 0] | [-1, 1, 0] | [1, -1, 0] | [-1, -1, 0] | [1, 0, 1] | [-1, 0, 1] | [1, 0, -1] | [-1, 0, -1] | [0, 1, 1] | [0, -1, 1] | [0, 1, -1] | [0, -1, -1];

const voxelEdges: VoxelEdge[] = [
	[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

function mergeEdges(a: VoxelEdge[], b: VoxelEdge[]): VoxelEdge[] {
	let merged: VoxelEdge[] = a.slice();
	for (const edge2 of b){
		if (a.some(edge1 => Vec3.equal(edge1, edge2))) continue;
		merged.push(edge2);
	}
	return merged;
}

function findDirectionIndexOfEdge(edge: VoxelEdge): number {
	for (let i = 0; i < 3; i++){
		if (edge[i] === 0) return i;
	}
}

function voxelEdgeToPolyline(edge: VoxelEdge): [Vector3, Vector3] {
	const scaledEdge = Vec3.multiply(edge, 0.5);
	const zeroIndex = findDirectionIndexOfEdge(edge);
	let p1 = scaledEdge.slice() as Vector3;
	p1[zeroIndex] = +0.5;
	let p2 = scaledEdge.slice() as Vector3;
	p2[zeroIndex] = -0.5;
	return [p1, p2];
}

function createFaceNormalByIndexAndSign(index: number, sign: number): VoxelFaceNormal {
	let normal = [0, 0, 0];
	normal[index] = sign;
	return normal as VoxelFaceNormal;
}

function getAdjacentFaces(edge: VoxelEdge): [VoxelFaceNormal, VoxelFaceNormal] {
	const faces: VoxelFaceNormal[] = [];
	for (let i = 0; i < edge.length; i++){
		if (edge[i] === 0) continue;
		faces.push(createFaceNormalByIndexAndSign(i, Math.sign(edge[i])));
	}
	return faces as [VoxelFaceNormal, VoxelFaceNormal];
}

function normalsContain(faceNormals: VoxelFaceNormal[], normal: VoxelFaceNormal){
	return faceNormals.some(cur => Vec3.equal(cur, normal));
}

const isEdgeVisible = (visibleFaces: VoxelFaceNormal[]) => (edge: VoxelEdge) => {
	const adjacentFaces = getAdjacentFaces(edge);
	return normalsContain(visibleFaces, adjacentFaces[0]) || normalsContain(visibleFaces, adjacentFaces[1]);
}

type WireVoxel = {
	type: "wire",
	edges: VoxelEdge[]
} & VoxelBase;


//embellished voxel ###

type VoxelBase = {
	position: Vector3
};

type FilledVoxel = {
	type: "filled",
	color: Vector3, 
	alpha: number
} & VoxelBase;

type CamVoxel = {
	type: "camera"
} & VoxelBase;

type Voxel = FilledVoxel | WireVoxel | CamVoxel;
const getVoxelPosition = (voxel: Voxel) => voxel.position;

const EqVec3: Eq<Vector3> = {
	equals: Vec3.equal
};
const EqVoxel = contramap(getVoxelPosition)(EqVec3);
const noOrdVoxel: Ord<Voxel> = {
	equals: EqVoxel.equals,
	compare: (x, y) => 0
};

const randomSubSet = (density: number) => <T>(array: T[]): T[] => array.filter(() => Math.random() < density);

function createBoxPoints(halfSize: number): Vector3[] {
	let voxels: Vector3[] = [];
	for (let x = -halfSize; x <= halfSize; x++) {
		for (let y = -halfSize; y <= halfSize; y++) {
			for (let z = -halfSize; z <= halfSize; z++) {
				voxels.push([x, y, z]);
			}
		}
	}
	return voxels;
}

function randomRgbVector(): Vector3 {
	return [0, 1, 2].map(() => Math.round(Math.random() * 255)) as Vector3;
}

function countNonZeroComponents(v: Vector3): number {
	let count = 0;
	for (const c of v){
		if (c !== 0) count++;
	}
	return count;
}



//outlines ###

function createBoxOutline(s: number): WireVoxel[] {
	const r = range(-s + 1, +s - 1);
	return [
		...pipe(
			voxelCorners, 
			map(
				corner => {
					const edges = getEdgesAdjacentToCorner(corner);
					return {
						type: "wire", 
						position: Vec3.multiply(corner, s), 
						edges
					} as WireVoxel
				}
			)
		),

		...pipe(
			voxelEdges,
			map(
				edge => {
					const positionBase: Vector3 = Vec3.multiply(edge, s);
					const dirIndex = findDirectionIndexOfEdge(edge);
					return r.map(
						i => {
							let curPosition = positionBase.slice();
							curPosition[dirIndex] = i;
							return {
								type: "wire", 
								position: curPosition, 
								edges: [edge]
							} as WireVoxel
						}
					)
				}
			),
			flatten
		)
	];
}

type BoundingBox = [
	[number, number],
	[number, number],
	[number, number]
];
function findBoundingBox(points: NonEmptyArray<Vector3>): BoundingBox {
	return [0, 1, 2].map(
		index => {
			const components = mapNEA(p => p[index])(points);
			return [
				minItem(ordNumber)(components), 
				maxItem(ordNumber)(components)
			]
		}
	) as BoundingBox
}

const isBoundingCagePoint = (bbox: BoundingBox) => (point: Vector3): boolean => {
	let extremeComponentCount = 0;
	for (let i = 0; i < 3; i++){
		const component = point[i];
		const extremes = bbox[i];
		if (component === extremes[0] || component === extremes[1]){
			extremeComponentCount++;
		}
	}
	return extremeComponentCount > 1;
};

const getEdgesOfCagePoint = (bbox: BoundingBox, point: Vector3): VoxelEdge[] => {
	return voxelEdges.filter(
		edge => {
			for (let i = 0; i < 3; i++){
				if (edge[i] === 0) continue;
				const extremeIndex = (edge[i] + 1) / 2;
				if (point[i] !== bbox[i][extremeIndex]) return false;
			}
			return true;
		}
	)
};
function createCageVoxels(points: Vector3[]): WireVoxel[] {
	if (points.length === 0) return [];
	const bbox = findBoundingBox(points as NonEmptyArray<Vector3>);
	const cagePoints = points.filter(isBoundingCagePoint(bbox));
	return cagePoints.map(
		position => ({
			type: "wire",
			edges: getEdgesOfCagePoint(bbox, position),
			position
		} as WireVoxel)
	)
}

function createSubSpaceOutline(s: number, signPattern: SignPattern): WireVoxel[] {
	return pipe(
		s, 
		createBoxPoints, 
		filter(isPointInSubSpace(signPattern)),
		createCageVoxels
	)
}

function mergeWireVoxels(a: WireVoxel[], b: WireVoxel[]): WireVoxel[] {
	let merged: WireVoxel[] = [];
	for (const voxel1 of a){
		const voxel2Index = b.findIndex(voxel2 => EqVoxel.equals(voxel1, voxel2));
		if (voxel2Index < 0){
			merged.push(voxel1);
		}
		else {
			const voxel2 = b[voxel2Index];
			merged.push({
				type: "wire",
				position: voxel1.position,
				edges: mergeEdges(voxel1.edges, voxel2.edges)
			});
			b = filterWithIndex<WireVoxel>(i => i !== voxel2Index)(b);
		}
	}
	merged.push(...b);
	return merged;
}


const boxSize = 5;

const focusedSubSpace: SignPattern = [1, 1, 1];
const initialDemoVoxels: Voxel[] = [
	// {
	// 	type: "camera", 
	// 	position: [0, 0, 0]
	// },
	...pipe(
		createBoxPoints(boxSize),
		// filter(flow(isPointInSubSpace(focusedSubSpace))),
		randomSubSet(0.08),
		map(position => ({
			type: "filled",
			position,
			color: randomRgbVector(),//[145, 171, 179],// randomRgbVector(),
			alpha: 1,
		} as FilledVoxel))
	)
];

let voxels: Voxel[] = [
	...initialDemoVoxels,
	// ...createBoxOutline(boxSize),
	// ...mergeWireVoxels(
	// 	createSubSpaceOutline(boxSize, focusedSubSpace),
	// 	createBoxOutline(boxSize)
	// ),
];



const sortVoxels = createVoxelArraySortFunctionWithCamPosition<Voxel, Vector3>(getVoxelPosition, 3);


function renderFilledVoxel(ctx: CanvasRenderingContext2D, camera: PerspectiveCamera, voxel: FilledVoxel){
	for (const normal of voxelFaceNormals) {
		const curProjectionOpt = projectVoxelFace(ctx, camera, voxel.position, normal);
		if (isNone(curProjectionOpt)) continue;
		const brightness = interpolate(
			1, 0.3,
			Math.max(0, Vec3.dot(normal, lightDirection))
		);
		const adjustedColor = voxel.color.map(c => Math.round(c * brightness)) as Vector3;
		ctx.fillStyle = `rgb(${adjustedColor.join(",")})`;
		ctx.globalAlpha = voxel.alpha;
		pathPolygon(ctx, curProjectionOpt.value);
		ctx.fill();
		ctx.stroke();
	}
}
function renderWireVoxel(ctx: CanvasRenderingContext2D, worldPointToScreenPoint: Morphism<Vector3, Vector2>, voxel: WireVoxel){
	ctx.globalAlpha = 1;
	ctx.strokeStyle = "black";
	for (const edge of voxel.edges) {
		const edgePolyline = voxelEdgeToPolyline(edge).map(v => Vec3.add(voxel.position, v));
		const edgePolylineScreen = edgePolyline.map(worldPointToScreenPoint);
		pathPolyline(ctx, edgePolylineScreen);
		ctx.lineWidth = 3;
		ctx.globalAlpha = 0.5;
		// ctx.setLineDash([14, 14]);
		ctx.strokeStyle = "black";
		ctx.stroke();
	}
}
function drawCameraIcon(ctx: CanvasRenderingContext2D) {
	ctx.save();
	const scale = 0.25;
	ctx.scale(scale, scale);
	ctx.fillStyle = "black";

	ctx.translate(-0.4, -0.2);

	ctx.fillRect(-0.9, -0.5, 1.8, 1);

	ctx.beginPath();
	ctx.moveTo(0.15, 0);
	ctx.lineTo(1.85, -0.8);
	ctx.lineTo(1.85, 0.8);
	ctx.closePath();
	ctx.fill();

	drawDisc(ctx, [0.37, 1], 0.52);
	drawDisc(ctx, [-0.45, 0.8], 0.34);

	ctx.restore();
}
function renderCamVoxel(ctx: CanvasRenderingContext2D, camera: PerspectiveCamera, voxel: CamVoxel) {
	ctx.save();
	Object.assign(ctx, {
		fillStyle: "black"
	});
	const iconScale = 1000 / Vec3.magnitude(camera.transform.position);
	ctx.scale(iconScale, iconScale);
	drawCameraIcon(ctx);
	ctx.restore();
	renderWireVoxel(
		ctx, worldPointToScreenPoint(ctx, camera), 
		{ type: "wire", position: [0, 0, 0], edges: voxelEdges }
	);
}

const renderVoxel = (ctx: CanvasRenderingContext2D, camera: PerspectiveCamera) => (voxel: Voxel) => {
	ctx.save();
	if (voxel.type === "filled") renderFilledVoxel(ctx, camera, voxel);
	else if (voxel.type === "wire") renderWireVoxel(ctx, worldPointToScreenPoint(ctx, camera), voxel);
	else if (voxel.type === "camera") renderCamVoxel(ctx, camera, voxel);
	ctx.restore();
};

function renderVoxels(ctx: CanvasRenderingContext2D, camera: PerspectiveCamera, voxels: Voxel[]) {
	const visibleVoxels = voxels.filter(voxel => !isVoxelBehindCamera(camera)(voxel.position));
	const sortedVoxels = useOcclusion ? sortVoxels(camera.transform.position, visibleVoxels) : visibleVoxels;
	sortedVoxels.forEach(renderVoxel(ctx, camera));
}

const render = () => {

	const { canvas } = ctx;
	const [w, h] = [canvas.width, canvas.height];

	ctx.save();
	ctx.fillStyle = backgroundColor;
	ctx.fillRect(0, 0, w, h);
	ctx.translate(w / 2, h / 2);
	ctx.scale(window.devicePixelRatio, -window.devicePixelRatio);

	// const regularCam = toRegularCamera(camera);
	const perspectiveCam = {
		...toRegularCamera(camera),
		settings: {
			planeWidthHalf: canvas.width, 
			planeHeightHalf: canvas.height, 
			zScale: 2000
		}
	} as PerspectiveCamera;
	Object.assign(ctx, {
		strokeStyle: "#3b3a39",
		lineWidth: 3,
		lineJoin: "round"
	} as Partial<CanvasRenderingContext2D>);
	renderVoxels(ctx, perspectiveCam, voxels);

	ctx.restore();
};

function create3DPatterns(): SignPattern[] {
	return [
		[+1, +1, +1],
		[-1, +1, +1],
		[+1, -1, +1],
		[-1, -1, +1],
		[+1, +1, -1],
		[-1, +1, -1],
		[+1, -1, -1],
		[-1, -1, -1],
	]
}
function create2DPatterns(): SignPattern[] {
	return [
		[0, +1, +1],
		[0, -1, +1],
		[0, +1, -1],
		[0, -1, -1],
		[+1, 0, +1],
		[-1, 0, +1],
		[+1, 0, -1],
		[-1, 0, -1],
		[+1, +1, 0],
		[-1, +1, 0],
		[+1, -1, 0],
		[-1, -1, 0],
	]
}
function create1DPatterns(): SignPattern[] {
	return [
		[+1, 0, 0],
		[-1, 0, 0],
		[0, +1, 0],
		[0, -1, 0],
		[0, 0, +1],
		[0, 0, -1]
	]
}
function createAllSignPattern(): SignPattern[] {
	return [
		...create3DPatterns(),
		...create2DPatterns(),
		...create1DPatterns()
	]
}

function wait(millis: number) {
	return new Promise(resolve => window.setTimeout(resolve, millis))
}
async function animate(){
	const stepTime = 100;
	const allPattern = createAllSignPattern();
	// const allPattern = [focusedSubSpace];
	const boxOutline = createBoxOutline(boxSize);
	let demoVoxels: Voxel[] = initialDemoVoxels;
	for (const pattern of allPattern){
		const dim = countNonZeroComponents(pattern);
		const maxSliceVal = boxSize * dim;
		const minSliceVal = dim;
		for (let i = maxSliceVal; i >= minSliceVal; i--){
			const curSlice: VoxelSubSpaceSlice = {
				signPattern: pattern,
				value: i
			};
			demoVoxels = demoVoxels.map(
				vox => {
					if (!isPointInSubSpaceSlice(curSlice)(vox.position)) return vox;
					return { ...vox, alpha: 1 }
				}
			);
			voxels = [
				...demoVoxels,
				...mergeWireVoxels(
					createSubSpaceOutline(boxSize, pattern),
					boxOutline
				),
				...getBoxVoxelsInSubSpaceSlice(boxSize, curSlice)
			];
			render();
			await wait(stepTime);
		}
	}
	voxels = [...demoVoxels, ...boxOutline];
	render();
}


function setupOrbitCameraControl(){
	canvas.addEventListener("mousemove", e => {
		if (e.buttons !== 1) return;
		const s = 0.01;
		camera = {
			...camera, 
			longitude: camera.longitude + e.movementX * s,
			latitude: camera.latitude + e.movementY * s
		}
		render();
	});
	canvas.addEventListener("wheel", e => {
		camera = {
			...camera,
			radius: camera.radius * (1 + e.deltaY * 0.001)
		}
		render();
	});
}
function setupOcclusionControl() {
	document.body.insertAdjacentHTML("beforeend", `
		<div
			id="occlusion-indicator"
			style="
				position: absolute;
				top: 25px;
				left: 0px;
				right: 0px;
				display: flex;
				justify-content: center;
				font-weight: bold;
				font-size: 60px;
			"
		>occlusion on</div>
	`);
	document.addEventListener("keydown", e => {
		if (e.key !== "o") return;
		useOcclusion = !useOcclusion;
		document.querySelector("#occlusion-indicator").innerHTML = `occlusion ${useOcclusion ? "on" : "off"}`;
		render();
	});
}


const main = () => {
	updateCanvasSize();
	onresize();
	setupOrbitCameraControl();
	render();
	document.addEventListener("keydown", e => {
		if (e.code === "Space"){
			animate();
		}
	});
	setupOcclusionControl();
};
main();