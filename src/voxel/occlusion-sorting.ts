import { map, mapWithIndex } from "fp-ts/lib/Array";
import { flow, pipe } from "fp-ts/lib/function";
import { init, NonEmptyArray, reverse, sort } from "fp-ts/lib/NonEmptyArray";
import { contramap, ordNumber, getDualOrd } from "fp-ts/lib/Ord";
import { Morphism, Vector2 } from "../../lib/types";
import { WithIndex, getValue, getIndex, map as mapWIndex, withIndices, getIndices, getItems } from '../../lib/with-index';

/*

this method of occlusion works by chopping up the space into regions, 
for example the region of voxels x > 0, y > 0, z > 0
all the voxels in a region are sorted by on what diagonal row they are located. 
each diagonal occludes all diagonals behind it and voxels on the same diagonal are independent of occlusion.
this gives a nice function for comparing diagonals: simply add the components of a voxel, like x + y + z, or x + z, depending on the region. 
in 3D there are volumetric regions like the example above, planar regions like x > 0, y = 0, z < 0 and linear regions like x = 0, y > 0, z = 0. 
linear regions can occlude planar regions and planar regions can occlude volumetric regions but not the other way around, so they have to be rendered in the right order. 
the method is not specific to 3D and can be generalized to any dimension which i did in the code. 
it involves finding all the relevant subspaces by forming all the combinations of signs. 
for example in 2D, there are 8 subspaces defined by 
x > 0, y > 0
x < 0, y > 0
x > 0, y < 0
x < 0, y < 0
x = 0, y > 0
x = 0, y < 0
x > 0, y = 0
x < 0, y = 0

we omit the block where the camera is situated, x = 0, y = 0. 
for sorting, all the voxels are relative to the camera. 
the camera is not perfectly at the center of x = 0, y = 0, but can be anywhere within that block. 

the dimensionality of a subregion is simply the number of non-zero "signs" it has. 
regions with lower dimensionality can occlude higher dimensionality ones but not the other way around, 
so we sort them accordingly. 
the voxels in each subspace are sorted by their "diagonality". 
for example the diagonality of a voxel in the subspace x > 0, y < 0 is +x - y. 
the diagonality in the subspace x = 0, y > 0 is simply y, the voxels are sorted in linear order as you'd expect. 

*/


type Sign = 1 | 0 | -1;
type SignPattern = Sign[];
//example:
//l = 2, output: [[+1, +1], [+1, 0], [+1, -1], [0, +1], [0, 0], [0, -1], [-1, +1], [-1, 0], [-1, -1]]
function getAllSignPatterns(l: number): SignPattern[] {
	if (l === 0) return [[]];
	const subCombinations = getAllSignPatterns(l - 1);
	return [
		...subCombinations.map(comb => [+1, ...comb]), 
		...subCombinations.map(comb => [0, ...comb]),
		...subCombinations.map(comb => [-1, ...comb])
	] as SignPattern[]
}
function getSignPatternDimensionality(pattern: SignPattern): number {
	let dim = 0;
	for (const sign of pattern) dim += Math.abs(sign);
	return dim;
}
const signPatternOrd = getDualOrd(contramap(getSignPatternDimensionality)(ordNumber));


const vectorMatchesSignPattern = (signPattern: number[]) => (v: number[]): boolean => {
	for (let i = 0; i < v.length; i++){
		if (Math.sign(v[i]) !== signPattern[i]) return false;
	}
	return true;
};

function mergeArrays<T>(arrays: T[][]): T[] {
	const merged: T[] = [];
	for (const array of arrays){
		merged.push(...array);
	}
	return merged;
}


//vector operations ###

const combineVectorsComponentWise = (comb: (n1: number, n2: number) => number) => <V extends number[]>(a: V, b: V): V => {
	const l = a.length;
	let result: number[] = [];
	for (let i = 0; i < l; i++){
		result[i] = comb(a[i], b[i]);
	}
	return result as V;
};
const addNumbers = (a: number, b: number) => a + b;
const subtractNumbers = (a: number, b: number) => a - b;
const addVectors = combineVectorsComponentWise(addNumbers);
const subVectors = combineVectorsComponentWise(subtractNumbers);
const makeVectorRelative = <V extends number[]>(r: V) => (v: V): V => {
	return subVectors(v, r);
}
const makeVectorUnrelative = <V extends number[]>(o: V) => (v: V): V => {
	return addVectors(v, o);
}
function roundVector<V extends number[]>(v: V): V {
	return v.map(Math.round) as V;
}

const log = (label: string) => <T>(t: T): T => {
	console.log("### label ###");
	console.log(t);
	return t;
};

export function createVoxelArraySortFunctionWithCamPosition<T, V extends number[]>(m: Morphism<T, V>, d: number){
	const sortFunc = createVoxelArraySortFunction<WithIndex<V>, V>(getValue, d);
	return (camPosition: V, voxels: T[]) => {
		const wrappedVoxels = withIndices(voxels.map(m));
		camPosition = roundVector(camPosition);
		return pipe(
			wrappedVoxels,
			map(
				mapWIndex(
					makeVectorRelative(camPosition)
				)
			),
			sortFunc, 
			map(
				mapWIndex(
					makeVectorRelative(camPosition)
				)
			),
			getIndices, getItems(voxels)
		)
	}
}

function createVoxelArraySortFunction<T, V extends number[]>(m: Morphism<T, V>, d: number) {
	const signPatterns: SignPattern[] = pipe(
		d, 
		getAllSignPatterns as Morphism<number, NonEmptyArray<SignPattern>>, 
		sort(signPatternOrd), 
		init
	);
	return flow(
		partitionVoxelsBySignPattern(m, signPatterns),
		mapWithIndex((i, p) => sortVoxelPartition(m, signPatterns[i], p)), 
		mergeArrays
	)
}

const partitionVoxelsBySignPattern = <T, V extends number[]>(m: Morphism<T, V>, patterns: SignPattern[]) => (voxels: T[]): T[][] => {
	return patterns.map(
		pattern => voxels.filter(
			flow(
				m, vectorMatchesSignPattern(pattern)
			)
		)
	)
};

const calculateDiagonalValue = (signPattern: SignPattern) => <V extends number[]>(voxel: V): number => {
	let componentSum: number = 0;
	for (let i = 0; i < signPattern.length; i++){
		componentSum += voxel[i] * signPattern[i];
	}
	return componentSum;
};

function sortVoxelPartition<T, V extends number[]>(m: Morphism<T, V>, signPattern: SignPattern, voxels: T[]): T[] {
	const indexedRowValues = withIndices(
		voxels.map(
			flow(
				m, calculateDiagonalValue(signPattern)
			)
		)
	); 
	const indexedRowsSortFunc = (a: Vector2, b: Vector2) => b[1] - a[1];
	const sortedRowValues = indexedRowValues.sort(indexedRowsSortFunc);
	return sortedRowValues.map(row => voxels[row[0]]);
}