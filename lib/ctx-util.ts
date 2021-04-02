import { Vector2 } from "./types";

export const pathPolygon = (ctx: CanvasRenderingContext2D, polygon: Vector2[]) => {
	pathPolyline(ctx, polygon);
	ctx.closePath();
};

export const pathPolyline = (ctx: CanvasRenderingContext2D, polyline: Vector2[]) => {
	ctx.beginPath();
	ctx.moveTo(...polyline[0]);
	polyline.slice(1).map(point => ctx.lineTo(...point));
};

export function drawDisc(ctx: CanvasRenderingContext2D, point: Vector2, radius: number, style?: Partial<CanvasRenderingContext2D>) {
	if (style) {
		Object.assign(ctx, style);
	}
	ctx.beginPath();
	ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);
	ctx.fill();
}