import { Transform } from '../../lib/transform';
import { Vector3, Vector2, Matrix3 } from '../../lib/types';
import { Camera } from './camera';

//projection ###

export interface PerspectiveCamera extends Camera {
	settings: CameraSettings 
}
export interface CameraSettings {
	zScale: number,
    planeWidthHalf: number, 
    planeHeightHalf: number
}
export const createCamSettingsFromCanvas = (zScale: number, planeScale: number, canvas: HTMLCanvasElement): CameraSettings => {
    return {
        zScale,
        planeWidthHalf: canvas.offsetWidth * planeScale / 2,
        planeHeightHalf: canvas.offsetHeight * planeScale / 2
    };
};
export const projectPoint = (cam: CameraSettings) => {
    return (point: Vector3) : Vector2 => {
        const c = cam.zScale / point[2];
        return [
            c * point[0] / cam.planeWidthHalf,
            c * point[1] / cam.planeHeightHalf
        ]
    } 
};
export const projectPoints = (cam: CameraSettings) => {
	return (points: Vector3[]) => {
		return points.map(projectPoint(cam));
	};
};