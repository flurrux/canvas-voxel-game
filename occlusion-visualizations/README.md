﻿
# the occlusion algorithm  

<img alt="animated algorithm 2d" src="./occlusion-2D.gif" height="300" />

diagonal lines occlude other diagonal lines further away. voxels in the same diagonal don't occlude each other. their order is irrelevant. 

<img alt="diagonals occlude diagonals" src="./diagonal-occludes-diagonal.png" height="300" />

voxels on the blue line can occlude voxels in the adjacent quadrants.  

<img alt="line occludes quadrant" src="./line-occludes-quadrant.png" height="300" /> 

but not the other way around!  

<img alt="quadrant does not occlude line" src="./quadrant-does-not-occlude-line.png" height="300" /> 


this principle extends to higher dimensions.  
here is the order of rendering in an empty 3D box:  

![empty sweep 3d](./empty-sweeping.gif)  

and now when the box has some voxels  

![full sweep 3d](./full-sweeping.gif)  