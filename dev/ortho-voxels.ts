import { filter, flatten } from 'fp-ts/lib/Array';
import { not, pipe } from 'fp-ts/lib/function';
import { Vector3 } from '../lib/types';
import { frustumCullVoxels, isVoxelBehindCamera } from '../src/frustum-culling';
import { createVoxelArraySortFunctionWithCamPosition } from '../src/occlusion-sorting';
import { Camera } from '../src/camera/perspective-projection';
import { worldPointToCamPoint } from '../src/space-conversion';
import { mapRange } from '../src/util';
import { projectVoxelFaces, renderVoxelProjections } from '../src/voxel-rendering';


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
	const screenSize = (window.innerWidth + window.innerHeight) / 2;
	const targetPlaneSize = mapRange([700, 1200], [2.5, 3], screenSize);
	const planeScale = targetPlaneSize / Math.min(canvas.offsetWidth, canvas.offsetHeight);
	camera = {
		...camera,
		settings: {
		zScale: 2,
			planeWidthHalf: canvas.offsetWidth * planeScale / 2,
			planeHeightHalf: canvas.offsetHeight * planeScale / 2
		}
	};
	render();
};
window.onresize = onresize;


type OrbitCamera = {
	radius: number,
	latitude: number, 
	longitude: number
};

//state & settings ###

const backgroundColor = "rgb(24, 26, 27)";

let voxels: Vector3[] = [
	[0, 0, 0]
];

const sortVoxels = createVoxelArraySortFunctionWithCamPosition<Vector3>(3);
function renderVoxels(ctx: CanvasRenderingContext2D, camera: Camera, voxels: Vector3[]) {
	const visibleVoxels = pipe(
		voxels,
		filter(not(isVoxelBehindCamera(camera))),
		frustumCullVoxels(camera, worldPointToCamPoint(camera))
	);
	const sortedVoxels = sortVoxels(camera.transform.position, visibleVoxels);
	const screenPolygons = flatten(sortedVoxels.map(projectVoxelFaces(ctx, camera)));
	renderVoxelProjections(ctx, screenPolygons);
}

const render = () => {

	const { canvas } = ctx;
	const [w, h] = [canvas.width, canvas.height];

	ctx.save();
	ctx.fillStyle = backgroundColor;
	ctx.fillRect(0, 0, w, h);
	ctx.translate(w / 2, h / 2);
	ctx.scale(window.devicePixelRatio, -window.devicePixelRatio);

	const camera: Camera = {
		settings
	};
	renderVoxels(ctx, camera, voxels);

	ctx.restore();
};



const main = () => {
	updateCanvasSize();
	onresize();
	render();
};
main();