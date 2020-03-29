
/**
 * Retrieve the first inserted value from a map
 * @param collection - the collection to retrieve from
 * @returns the first value inserted into collection, or undefined if the collection is empty
 */
export function head<K, V>(collection: Map<K, V>): [K, V] | undefined {
	const it = collection.entries().next();
	if (it.done) {
		return undefined;
	} else {
		return it.value;
	}
}
