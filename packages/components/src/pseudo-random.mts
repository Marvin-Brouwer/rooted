
let RANDOM_SEED = 1155538974538966
export function pseudoRandom() {
	let x = Math.sin(RANDOM_SEED++) * 10000
	return x - Math.floor(x)
}