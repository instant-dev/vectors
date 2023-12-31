/**
 * Convert strings and other objects to vectors, while automatically batching
 * requests to minimize network and / or processor IO
 * Defaults are set to work best with OpenAI's text-embedding-ada-002 model
 */
class VectorManager {

  constructor () {
    this.__initialize__();
  }

  /**
   * @private
   */
  __initialize__ () {
    this.maximumBatchSize = 7168 * 4; // 4 tokens per word, estimated
    this.maximumParallelRequests = 10; // 10 requests simultaneously max
    this.fastQueueTime = 10; // time to wait if no other entries are added
    this.waitQueueTime = 100; // time to wait to collect entries if 1+ entries are added
    /**
     * @private
     */
    this._vectorize = null;
    /**
     * @private
     */
    this._queue = [];
    /**
     * @private
     */
    this._results = new WeakMap();
    /**
     * @private
     */
    this._timeout = null;
    /**
     * @private
     */
    this._processing = false;
  }

  /**
   * @private
   */
  async __sleep__ (t) {
    return new Promise(r => setTimeout(() => r(true), t));
  }

  /**
   * @private
   */
  async __dequeue__ () {
    this._processing = true;
    clearTimeout(this._timeout);
    const queue = this._queue.slice();
    this._timeout = null;
    this._queue = [];
    await this.batchVectorize(queue);
    this._processing = false;
    return true;
  }

  /**
   * @private
   */
  async vectorizeValues (values) {
    const vectors = await this._vectorize(values);
    return vectors;
  }

  /**
   * @private
   */
  async batchVectorize (queue) {
    const strValues = queue.map(item => this.convertToString(item.value));
    const batches = [[]];
    let curBatchSize = 0;
    while (strValues.length) {
      const str = strValues.shift().slice(0, this.maximumBatchSize);
      let n = batches.length - 1;
      curBatchSize += str.length;
      if (curBatchSize > this.maximumBatchSize) {
        batches.push([str]);
        n = batches.length - 1;
        curBatchSize = str.length;
      } else {
        batches[n].push(str);
      }
    }
    let i = 0;
    while (batches.length) {
      const parallelBatches = batches.splice(0, this.maximumParallelRequests);
      const parallelVectors = await Promise.allSettled(parallelBatches.map(strValues => this.vectorizeValues(strValues)));
      parallelVectors.forEach((result, j) => {
        if (result.status === 'rejected') {
          parallelBatches[j].forEach((str, k) => {
            let reason = result.reason;
            if (!(reason instanceof Error)) {
              reason = new Error(reason);
            }
            this._results.set(queue[i++], reason);
          });
        } else {
          let vectors = result.value;
          vectors = Array.isArray(vectors)
            ? vectors
            : [];
          parallelBatches[j].forEach((str, k) => {
            if (vectors[k]) {
              this._results.set(queue[i++], vectors[k]);
            } else {
              this._results.set(queue[i++], -1);
            }
          });
        }
      });
    }
    return true;
  }

  /**
   * Converts the provided value to a string for easy vectorization
   * @param {any} value 
   * @returns {string}
   */
  convertToString (value) {
    return (value === null || value === void 0)
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : (value + '');
  }

  /**
   * Sets the vector engine: takes in an array of values with a maximum string length of this.maximumBatchSize
   * @param {function} fnVectorize Expects a single argument, values, that is an array
   * @returns {boolean}
   */
  setEngine (fnVectorize) {
    if (typeof fnVectorize !== 'function') {
      throw new Error(`.setEngine(fn) expects a valid function`);
    } else if (fnVectorize.constructor.name !== 'AsyncFunction') {
      throw new Error(`.setEngine(fn) expects an Asynchronous function`);
    }
    this._vectorize = fnVectorize;
    return true;
  }

  async createTimeout () {
    this._timeout = setTimeout(() => {
      if (this._processing) {
        this.createTimeout();
      } else if (this._queue.length <= 1) {
        this.__dequeue__();
      } else {
        this._timeout = setTimeout(
          () => this.__dequeue__(),
          this.waitQueueTime - this.fastQueueTime
        );
      }
    }, this.fastQueueTime);
  }

  /**
   * Creates a vector from a value
   * @param {any} value Any value. null and undefined are converted to empty strings, non-string values are JSONified
   * @returns 
   */
  async create (value) {
    if (!this._vectorize) {
      throw new Error(
        `Could not vectorize: no vector engine has been set.\n` +
        `Use Instant.Vectors.setEngine(fn) to enable.`
      );
    }
    const item = {value};
    this._queue.push(item);
    if (!this._timeout) {
      this.createTimeout();
    }
    let result = null;
    while (!(result = this._results.get(item))) {
      await this.__sleep__(10);
    }
    this._results.delete(item);
    if (result instanceof Error) {
      throw result;
    } else if (!Array.isArray(result)) {
      throw new Error(
        `Could not vectorize: vector engine did not return a valid vector for input "${value}"`
      );
    }
    return result;
  }

  /**
   * Batch creates vectors from an array
   * @param {array} values Any values. null and undefined are converted to empty strings, non-string values are JSONified
   * @returns 
   */
  async batchCreate (values) {
    return Promise.all(values.map(value => this.create(value)));
  }

};

module.exports = VectorManager;