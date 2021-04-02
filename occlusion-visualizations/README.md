﻿
# the occlusion algorithm  

without occlusion, the order of the voxels will be wrong  

![occlusion vs. no occlusion](./occlusion-comparison.gif)  

here is a simple visualization of how the voxels are ordered  

![animated algorithm 2D](./occlusion-2D.gif)  

diagonal lines occlude other diagonal lines further away. voxels in the same diagonal don't occlude each other. their order is irrelevant. 

![diagonals occlude diagonals](./diagonal-occludes-diagonal.png)  

voxels on the blue line can occlude voxels in the adjacent quadrants.  

![line occludes quadrant](./line-occludes-quadrant.png)  

but not the other way around!  

![quadrant does not occlude line](./quadrant-does-not-occlude-line.png)  

this principle extends to higher dimensions.  
here is the order of rendering in an empty 3D box:  

![render order demonstration 3D](./empty-sweeping.gif)  

and now when the box has some voxels  

![another render order demonstration 3D](./full-sweeping.gif)  