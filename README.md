# simple voxel game

![demo gif](https://github.com/flurrux/canvas-voxel-game/blob/main/demo.gif)

a very simple voxel game that i made using only [2d canvas](https://developer.mozilla.org/de/docs/Web/API/CanvasRenderingContext2D).  

the game has simple physics like jumping and collision with voxels (no upward collision). 
leftclick to place a voxel. rightclick to destroy one.  

the code is not optimized at all and adding a couple hunded voxels will cause the frames to drop!  

game: https://xenodochial-galileo-70d0a4.netlify.app/

## why and how?

i just had the strong urge to figure out an occlusion algorithm for voxels and then render them with CanvasRenderingContext2D, my favourite graphics API.  

here is a visualization of the occlusion algorithm i came up with in 2D

![occlusion 2d](https://github.com/flurrux/canvas-voxel-game/blob/main/occlusion-2D.gif)
