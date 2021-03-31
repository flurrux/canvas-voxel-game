import { Vector2 } from "../lib/types";

export const pathPolygon = (ctx: CanvasRenderingContext2D, polygon: Vector2[]) => {
	ctx.beginPath();
	ctx.moveTo(...polygon[0]);
	polygon.slice(1).map(point => ctx.lineTo(...point));
	ctx.closePath();
};

export function drawDisc(ctx: CanvasRenderingContext2D, point: Vector2, radius: number, style?: Partial<CanvasRenderingContext2D>) {
	if (style) {
		Object.assign(ctx, style);
	}
	ctx.beginPath();
	ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);
	ctx.fill();
}