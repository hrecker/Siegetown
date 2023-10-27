let currentId = 0;
/** Get a new, unused id */
export function getNewId() {
    currentId++;
    return currentId;
}
