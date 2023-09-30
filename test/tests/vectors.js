const OpenAI = require('openai');
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

const { VectorManager } = require('../../index.js');

module.exports = (InstantORM, Databases) => {

  const expect = require('chai').expect;

  const Vectors = new VectorManager();

  describe('VectorManager', async () => {

    it('Should fail to vectorize without vector engine set', async () => {

      const testPhrase = `I am extremely happy`;

      let vector;
      let error;

      try {
        vector = await Vectors.create(testPhrase);
      } catch (e) {
        error = e;
      }

      expect(error).to.exist;
      expect(error.message).to.contain('Could not vectorize: no vector engine has been set');

    });

    it('Should fail to vectorize with a bad vector engine', async () => {

      const testPhrase = `I am extremely happy`;

      Vectors.setEngine(async (values) => {
        // do nothing
      });
      
      let vector;

      try {
        vector = await Vectors.create(testPhrase);
      } catch (e) {
        error = e;
      }

      expect(error).to.exist;
      expect(error.message).to.contain('Could not vectorize: vector engine did not return a valid vector for input "I am extremely happy"');

    });

    it('Should throw error when vector engine throws error', async () => {

      const testPhrase = `I am extremely happy`;

      Vectors.setEngine(async (values) => {
        throw new Error(`Not good!`);
      });
      
      let vector;

      try {
        vector = await Vectors.create(testPhrase);
      } catch (e) {
        error = e;
      }

      expect(error).to.exist;
      expect(error.message).to.equal('Not good!');

    });

    it('Should succeed at vectorizing when vector engine is set properly', async () => {

      const testPhrase = `I am extremely happy`;
      let testVector;

      Vectors.setEngine(async (values) => {
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: values,
        });
        const vectors = embedding.data.map((entry, i) => {
          let embedding = entry.embedding;
          if (values[i] === testPhrase) {
            testVector = embedding;
          }
          return embedding;
        });
        return vectors;
      });
      
      const vector = await Vectors.create(testPhrase);

      expect(vector).to.deep.equal(testVector);

    });

    it('Should create more vectors', async () => {

      const vectorMap = {};

      Vectors.setEngine(async (values) => {
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: values,
        });
        return embedding.data.map((entry, i) => {
          vectorMap[values[i]] = entry.embedding;
          return vectorMap[values[i]];
        });
      });

      const strings = [
        `I am feeling awful`,
        `I am in extreme distress`,
        `I am feeling pretty good`,
        `I am so-so`
      ]

      const vectors = await Promise.all(strings.map(str => Vectors.create(str)));

      expect(vectors).to.exist;
      expect(vectors.length).to.equal(4);
      vectors.forEach((vector, i) => {
        expect(vector).to.deep.equal(vectorMap[strings[i]]);
      });

    });

    it('Should create many more vectors (50 vectors, ~4 per batch)', async function () {

      this.timeout(10000);

      const vectorMap = {};

      Vectors.maximumBatchSize = 1000;
      Vectors.setEngine(async (values) => {
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: values,
        });
        return embedding.data.map((entry, i) => {
          vectorMap[values[i]] = entry.embedding;
          return vectorMap[values[i]];
        });
      });

      let strings = Array(50).fill(0).map((_, i) => {
        return i + '_ ' + Array(50).fill(0).map(() => {
          return ['alpha', 'beta', 'gamma'][(Math.random() * 3) | 0]
        }).join(' ');
      });

      const vectors = await Promise.all(strings.map(str => Vectors.create(str)));

      expect(vectors).to.exist;
      expect(vectors.length).to.equal(50);
      vectors.forEach((vector, i) => {
        expect(vector).to.deep.equal(vectorMap[strings[i]]);
      });

    });

  });

};
