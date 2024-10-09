"use strict";

/**
 * Hold a bunch of something
 * @template Class
 * @extends Map<Class>
 */
class Collection extends Map {
    /**
     * Construct a Collection
     * @param {Class} baseObject The base class for all items
     * @param {Number} [limit] Max number of items to hold
     */
    constructor(baseObject, limit) {
        super();
        /**
         * The base class for all items
         * @type {Class}
         */
        this.baseObject = baseObject;
        /**
         * Max number of items to hold
         * @type {Number?}
         */
        this.limit = limit;
    }

    /**
     * Get the first element of the collection
     * @returns {Class | undefined} The first element or undefined if empty
     */
    get first() {
        return this.values().next().value;
    }

    /**
     * Get the last element of the collection
     * @returns {Class | undefined} The last element or undefined if empty
     */
    get last() {
        return Array.from(this.values()).pop();
    }

    /**
     * Check if the collection is empty
     * @returns {boolean} True if empty, false otherwise
     */
    get isEmpty() {
        return this.size === 0;
    }

    /**
     * Get a random element from the collection
     * @returns {Class | undefined} A random element or undefined if empty
     */
    random() {
        if (this.isEmpty) return undefined;
        const index = Math.floor(Math.random() * this.size);
        return Array.from(this.values())[index];
    }

    /**
     * Add an object
     * @param {Object} obj The object data
     * @param {String} obj.id The ID of the object
     * @param {Class} [extra] An extra parameter the constructor may need
     * @param {Boolean} [replace] Whether to replace an existing object with the same ID
     * @returns {Class} The existing or newly created object
     */
    add(obj, extra, replace) {
        if(this.limit === 0) {
            return (obj instanceof this.baseObject || obj.constructor.name === this.baseObject.name) ? obj : new this.baseObject(obj, ...extra);
        }
    
        if(obj.id == null) {
            throw new Error("Missing object id");
        }
    
        const existing = this.get(obj.id);
        if(existing && !replace) {
            return existing;
        }
    
        if(!(obj instanceof this.baseObject || obj.constructor.name === this.baseObject.name)) {
            obj = new this.baseObject(obj, ...extra);
        }
    
        this.set(obj.id, obj);
    
        if(this.limit && this.size > this.limit) {
            const iter = this.keys();
            while(this.size > this.limit) {
                this.delete(iter.next().value);
            }
        }
    
        return obj;
    }

    /**
     * Remove an object
     * @param {Object} obj The object
     * @param {String} obj.id The ID of the object
     * @returns {Class?} The removed object, or null if nothing was removed
     */
    remove(obj) {
        const item = this.get(obj.id);
        if(!item) {
            return null;
        }
        this.delete(obj.id);
        return item;
    }

    /**
     * Update an object
     * @param {Object} obj The updated object data
     * @param {String} obj.id The ID of the object
     * @param {Class} [extra] An extra parameter the constructor may need
     * @param {Boolean} [replace] Whether to replace an existing object with the same ID
     * @returns {Class} The updated object
     */
    update(obj, extra, replace) {
        if(!obj.id && obj.id !== 0) {
            throw new Error("Missing object id");
        }
        const item = this.get(obj.id);
        if(!item) {
            return this.add(obj, extra, replace);
        }
        item.update(obj, extra);
        return item;
    }

    /**
     * Returns true if all elements satisfy the condition
     * @param {Function} func A function that takes an object and returns true or false
     * @returns {Boolean} Whether or not all elements satisfied the condition
     */
    every(func) {
        for(const item of this.values()) {
            if(!func(item)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Return all the objects that make the function evaluate true
     * @param {Function} func A function that takes an object and returns true if it matches
     * @returns {Array<Class>} An array containing all the objects that matched
     */
    filter(func) {
        const arr = [];
        for(const item of this.values()) {
            if(func(item)) {
                arr.push(item);
            }
        }
        return arr;
    }

    /**
     * Return the first object to make the function evaluate true
     * @param {Function} func A function that takes an object and returns true if it matches
     * @returns {Class?} The first matching object, or undefined if no match
     */
    find(func) {
        for(const item of this.values()) {
            if(func(item)) {
                return item;
            }
        }
        return undefined;
    }

    /**
     * Return an array with the results of applying the given function to each element
     * @param {Function} func A function that takes an object and returns something
     * @returns {Array} An array containing the results
     */
    map(func) {
        const arr = [];
        for(const item of this.values()) {
            arr.push(func(item));
        }
        return arr;
    }

    /**
     * Returns a value resulting from applying a function to every element of the collection
     * @param {Function} func A function that takes the previous value and the next item and returns a new value
     * @param {any} [initialValue] The initial value passed to the function
     * @returns {any} The final result
     */
    reduce(func, initialValue) {
        const iter = this.values();
        let val;
        let result = initialValue === undefined ? iter.next().value : initialValue;
        while((val = iter.next().value) !== undefined) {
            result = func(result, val);
        }
        return result;
    }

    /**
     * Returns true if at least one element satisfies the condition
     * @param {Function} func A function that takes an object and returns true or false
     * @returns {Boolean} Whether or not at least one element satisfied the condition
     */
    some(func) {
        for(const item of this.values()) {
            if(func(item)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Shuffle the collection in place
     */
    shuffle() {
        const arr = Array.from(this);
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        this.clear();
        for (const [key, value] of arr) {
            this.set(key, value);
        }
    }

    /**
     * Get a new shuffled collection
     * @returns {Collection} A new shuffled collection
     */
    shuffled() {
        const newCollection = new Collection(this.baseObject, this.limit);
        const arr = Array.from(this).sort(() => Math.random() - 0.5);
        for (const [key, value] of arr) {
            newCollection.set(key, value);
        }
        return newCollection;
    }

    /**
     * Swap two elements in the collection
     * @param {String} idA The ID of the first element
     * @param {String} idB The ID of the second element
     */
    swapAt(idA, idB) {
        const itemA = this.get(idA);
        const itemB = this.get(idB);
        if (itemA && itemB) {
            this.set(idA, itemB);
            this.set(idB, itemA);
        }
    }

    toString() {
        return `[Collection<${this.baseObject.name}>]`;
    }

    toJSON() {
        const json = {};
        for(const item of this.values()) {
            json[item.id] = item;
        }
        return json;
    }
}

module.exports = Collection;
