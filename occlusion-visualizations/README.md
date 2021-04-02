
# the occlusion algorithm  

[animated algorithm 2d](https://github.com/flurrux/canvas-voxel-game/blob/main/occlusion-visualizations/occlusion-2D.gif)

diagonal lines occlude other diagonal lines further away. voxels in the same diagonal don't occlude each other. their order is irrelevant. 

[diagonals occlude diagonals](https://github.com/flurrux/canvas-voxel-game/blob/main/occlusion-visualizations/diagonal-occludes-diagonal.png)  

voxels on the blue line can occlude voxels in the quadrants  

[line occludes quadrant](https://github.com/flurrux/canvas-voxel-game/blob/main/occlusion-visualizations/line-occludes-quadrant.png)  

but not the other way round!  

[quadrant does not occlude line](https://github.com/flurrux/canvas-voxel-game/blob/main/occlusion-visualizations/quadrant-does-not-occlude-line.png)  


this principle extends to higher dimensions. here is the order of rendering in an empty 3D box:  

[empty sweep 3d](https://github.com/flurrux/canvas-voxel-game/blob/main/occlusion-visualizations/empty-sweeping.gif)  

and now when the box has some voxels  

[full sweep 3d](https://github.com/flurrux/canvas-voxel-game/blob/main/occlusion-visualizations/full-sweeping.gif)  