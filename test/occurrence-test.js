import Backbone from 'backbone';
import Occurrence from '../src/Occurrence';
import Collection from '../src/Collection';
import Sample from '../src/Sample';
import Store from '../src/Store';
import { getRandomSample } from './helpers';

/* eslint-disable no-unused-expressions */

describe('Occurrence', () => {
  const store = new Store();

  it('should be a Backbone model', () => {
    const occurrence = new Occurrence();

    expect(occurrence).to.be.instanceOf(Backbone.Model);
    expect(occurrence.cid).to.be.a.string;
    expect(occurrence.attributes).to.be.an.object;
    expect(Object.keys(occurrence.attributes).length).to.be.equal(0);
  });

  it('should return JSON', () => {
    const item = Date.now().toString();
    const value = Math.random();
    const occurrence = new Occurrence();
    occurrence.set(item, value);

    const json = occurrence.toJSON();

    expect(json.cid).to.be.equal(occurrence.cid);
    expect(json.attributes[item]).to.be.equal(value);
  });

  it('should have a validator', () => {
    const occurrence = new Occurrence();
    expect(occurrence.validate).to.be.a('function');
  });

  it('should validate taxon', () => {
    const occurrence = new Occurrence();
    let invalids = occurrence.validate(null, { remote: true });

    expect(invalids).to.be.an('object');
    expect(invalids.taxon).to.be.a('string');

    occurrence.set('taxon', 1234);

    invalids = occurrence.validate(null, { remote: true });
    expect(invalids).to.be.null;
  });

  it('should save parent on destroy', (done) => {
    const sample = getRandomSample(store);

    // add sample to local storage
    sample.save().then(() => {
      sample.getOccurrence().destroy()
        .then(() => {
          const newCollection = new Collection(null, { store, model: Sample });
          newCollection.fetch().then(() => {
            expect(newCollection.length).to.be.equal(1);
            const occurrenceFromDB = newCollection.at(0).getOccurrence();

            expect(occurrenceFromDB).to.not.exist;
            expect(sample.occurrences.length).to.be.equal(0);
            done();
          });
        });
    });
  });
});
