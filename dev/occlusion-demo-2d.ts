import { drawDisc, pathPolygon, pathPolyline } from "../lib/ctx-util";
import { Vector2 } from "../lib/types";
// import { createVoxelArraySortFunctionWithCamPosition } from "../src/occlusion-sorting";
// import { sortVoxels } from "../src/occlusion-sorting";
import * as Vec2 from '../lib/vec2';

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
};
updateCanvasSize();

function createRandomVoxelGrid(w: number, h: number): Vector2[] {
	const voxels: Vector2[] = [];
	for (let i = -w; i <= w; i++){
		for (let j = -h; j <= h; j++){
			if (i === 0 && j === 0) continue;
			if (Math.random() > 0.3) continue;
			voxels.push([i, j]);
		}
	}
	return voxels;
}
function createAllVoxelsOnBoard(w: number, h: number): Vector2[] {
	const voxels: Vector2[] = [];
	for (let i = -w; i <= w; i++) {
		for (let j = -h; j <= h; j++) {
			voxels.push([i, j]);
		}
	}
	return voxels;
}

const boardSize: Vector2 = [6, 4];
const camPosition: Vector2 = [0, 0];
const camPositionRounded = camPosition.map(Math.round) as Vector2;
let voxelPoints: Vector2[] = ([
	[4, 1], [3, 2], [2, 3], [1, 4],
	[7, 1], [6, 2], [5, 3], [4, 4], [3, 5], [2, 6], [1, 7]
	// [0, 3], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [2, -1], [2, -2], [1, -2], [0, -3], [5, 4], [5, 3], [6, 3], [6, 4], [4, -4], [5, -3], [5, 1], [6, 1], [7, 1], [7, 0], [7, -1], [6, -1], [-1, 4], [-10, 4], [-10, 3], [-9, 3], [-9, 2], [-9, 1], [-10, 1], [-10, 0], [-10, -2], [-9, -2], [-8, -2], [-10, -4], [-9, -4], [-8, -4], [-7, -4], [-6, -4], [-6, -3], [-6, 4], [-6, 1], [-4, 3], [-3, -4], [-3, -3]
] as Vector2[]);

type VoxelObject = { position: Vector2, alpha: number };
const voxels = voxelPoints.map(position => ({
	position,
	alpha: 1
} as VoxelObject));

type DiagonalObject = { signPattern: Vector2, value: number, alpha: number };
const diagonal: DiagonalObject = { signPattern: [1, 1], value: 13, alpha: 1 };

//@ts-ignore
window.getVoxels = () => voxels;

function waitMillis(millis: number): Promise<void> {
	return new Promise(resolve => {
		return window.setTimeout(resolve, millis)
	})
}

function drawGrid(){
	ctx.save();
	ctx.translate(-0.5, -0.5);
	Object.assign(ctx, {
		lineWidth: 0.04,
		strokeStyle: "#404040",
		globalAlpha: 0.1
	});
	const [w, h] = [12, 9];
	for (let i = -w; i <= w; i++){
		ctx.beginPath();
		ctx.moveTo(i, -h);
		ctx.lineTo(i, +h);
		ctx.stroke();
	}
	for (let i = -h; i <= h; i++) {
		ctx.beginPath();
		ctx.moveTo(-w, i);
		ctx.lineTo(+w, i);
		ctx.stroke();
	}
	ctx.restore();
}
function drawVoxel(voxel: VoxelObject){
	ctx.save();
	const position = voxel.position;
	ctx.translate(-0.5 + position[0], -0.5 + position[1]);
	Object.assign(ctx, {
		lineWidth: 0.04,
		strokeStyle: "#363636",
		lineJoin: "round",
		fillStyle: "#877777",
		globalAlpha: voxel.alpha
	});
	ctx.fillRect(0, 0, 1, 1);
	ctx.strokeRect(0, 0, 1, 1);
	ctx.restore();
}

function drawCameraIcon(){
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
function drawLineStripes(){
	ctx.save();
	ctx.translate(...camPosition);
	Object.assign(ctx, {
		fillStyle: "#9bcee8",
		globalAlpha: 0.4
	});
	ctx.fillRect(-20, -0.5, 40, 1);
	ctx.fillRect(-0.5, -20, 1, 40);
	ctx.restore();
}
function drawCamera(){
	ctx.save();
	ctx.translate(...camPosition);
	Object.assign(ctx, {
		strokeStyle: "#b35959",
		lineWidth: 0.04
	});
	ctx.strokeRect(-0.5, -0.5, 1, 1);
	drawCameraIcon();
	ctx.restore();
}

const voxelMatchesPattern = (pattern: Vector2) => (voxel: Vector2): boolean => {
	return Math.sign(voxel[0]) === pattern[0] && Math.sign(voxel[1]) === pattern[1];
};
const calculateVoxelDiagonal = (pattern: Vector2, voxel: Vector2): number => {
	return pattern[0] * voxel[0] + pattern[1] * voxel[1];
};
const voxelIsOnDiagonal = (pattern: Vector2, diagonalValue: number) => (voxel: Vector2): boolean => {
	voxel = Vec2.subtract(voxel, camPositionRounded);
	return voxelMatchesPattern(pattern)(voxel) && calculateVoxelDiagonal(pattern, voxel) === diagonalValue
};

function getVoxelsInSubSpace(signPattern: Vector2, value: number){
	return createAllVoxelsOnBoard(10, 10).filter(voxelIsOnDiagonal(signPattern, value));
}
function highlightDiagonal(diag: DiagonalObject){
	const voxels = getVoxelsInSubSpace(diag.signPattern, diag.value);
	ctx.save();
	Object.assign(ctx, {
		// fillStyle: "#e3890b",
		// strokeStyle: "#e3890b",
		strokeStyle: "black",
		lineWidth: 0.06,
		globalAlpha: diag.alpha
	});
	for (const voxel of voxels){
		ctx.save();
		ctx.translate(-0.5 + voxel[0], -0.5 + voxel[1]);
		// ctx.globalAlpha *= 0.2;
		// ctx.fillRect(0, 0, 1, 1);
		// ctx.globalAlpha = diag.alpha;
		ctx.strokeRect(0, 0, 1, 1);
		ctx.restore();
	}
	ctx.restore();
}


const canvasScale = 80;

function visualizeOcclusion(){
	const camPoint: Vector2 = [-0.3, 0.2];

	for (let i = 0; i < 2; i++){
		for (let j = 0; j < 4; j++){
			const voxel = voxels[j].position;
			const vertex1 = [voxel[0] - 0.5, voxel[1] + 0.5] as Vector2;
			const vertex2 = [voxel[0] + 0.5, voxel[1] - 0.5] as Vector2;
			const ray1End = Vec2.multiply(Vec2.subtract(vertex1, camPoint), 10);
			const ray2End = Vec2.multiply(Vec2.subtract(vertex2, camPoint), 10);
			
			if (i === 0){
				pathPolygon(ctx, [
					vertex1, ray1End,
					ray2End, vertex2
				]);
				ctx.fillStyle = "black";
				ctx.globalAlpha = 0.3;
				ctx.fill();
			}
			else {
				ctx.globalAlpha = 1;
				ctx.lineWidth = 0.03;
				ctx.strokeStyle = "yellow";
				ctx.setLineDash([0.2, 0.2]);
				pathPolyline(ctx, [camPoint, ray1End]);
				ctx.stroke();
				pathPolyline(ctx, [camPoint, ray2End]);
				ctx.stroke();
			}
		}
	}
}

function render(){
	ctx.fillStyle = "#d1cac0";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.save();
	ctx.transform(canvasScale, 0, 0, -canvasScale, canvas.width / 2, canvas.height / 2);
	ctx.translate(-3, -3);

	drawLineStripes();
	drawCamera();
	drawGrid();
	voxels.forEach(drawVoxel);
	visualizeOcclusion();



	ctx.restore();
}


function interpolate(from: number, to: number, t: number){
	return from + (to - from) * t;
}
function animate(duration: number, animate: (p: number) => void): Promise<void> {
	return new Promise(resolve => {
		const startTime = window.performance.now();
		const loop = () => {
			const curTime = window.performance.now();
			const elapsedTime = Math.min(duration, (curTime - startTime));
			animate(elapsedTime / duration);
			render();
			if (elapsedTime < duration){
				requestAnimationFrame(loop);
			}
			else {
				resolve();
			}
		};
		requestAnimationFrame(loop);
	})
}
async function wait(millis: number){
	await animate(millis, () => {});
}

async function showVoxel(voxel: VoxelObject){
	await animate(150, p => voxel.alpha = interpolate(0.2, 1, p));
}

async function showCurrentVoxels() {
	const currentVoxels = voxels.filter(voxel => voxelIsOnDiagonal(diagonal.signPattern, diagonal.value)(voxel.position));
	for (const voxel of currentVoxels){
		await wait(100);
		showVoxel(voxel);
	}
}

async function playAnimation(){
	const signPatterns: Vector2[] = [
		[+1, +1],
		[+1, -1],
		[-1, -1],
		[-1, +1],
		[0, +1],
		[+1, 0],
		[0, -1],
		[-1, 0]
	];
	diagonal.alpha = 0;
	diagonal.signPattern = signPatterns[0];
	diagonal.value = 13;
	await animate(500, p => diagonal.alpha = p);
	
	for (const signPattern of signPatterns){
		diagonal.signPattern = signPattern;
		for (let i = 13; i >= 1; i--){
			diagonal.value = i;
			await showCurrentVoxels();
			await wait(300);
		}
	}
	await animate(500, p => diagonal.alpha = 1 - p);
}

// canvas.addEventListener("mousedown", e => {
// 	const scenePoint = [
// 		(e.offsetX - canvas.width / 2) / canvasScale,
// 		(e.offsetY - canvas.height / 2) / -canvasScale,
// 	].map(Math.round) as Vector2;
// 	voxels.push(scenePoint);
// 	render();
// });

render();
// playAnimation();