/* eslint max-classes-per-file: 0 */
import { Occurrence as OccOrig } from '@indicia-js/core';
import withRemote from '../';

const Occurrence = withRemote(OccOrig);

describe('Occurrence', function tests() {
  it('should have static keys property', () => {
    expect(typeof Occurrence.keys).toBe('object');
  });

  it('should have keys property', () => {
    const occ = new Occurrence();
    expect(occ.keys).toBe(Occurrence.keys);
  });

  it('should pass on the remote id', () => {
    const occ = new Occurrence({ id: 1 });
    expect(occ.id).toBe(1);
  });

  it('should extract the remote id when toJSON', () => {
    const occ = new Occurrence({ id: 1 });
    expect(occ.toJSON().id).toBe(1);
  });

  describe('getSubmission', () => {
    it('should return attribute values', () => {
      const occurrence = new Occurrence({
        attrs: {
          size: 'huge',
          number: 1234,
        },
      });
      occurrence.keys = { size: {}, number: {} };
      const submission = occurrence.getSubmission();
      expect(submission.values.size).toBe('huge');
      expect(submission.values.number).toBe(1234);
    });

    it('should not return anything for empty attribute values', () => {
      // Given
      const occurrence = new Occurrence({
        attrs: {
          comment: 'huge',
          customAttribute: null,
          customFalsyAttribute: 0,
          customFalsyBoolAttribute: false,
          customFalsyStrAttribute: '',
        },
      });

      // When
      const submission = occurrence.getSubmission();

      // Then
      expect(submission.values.comment).toBe('huge');
      expect(submission.values.customAttribute).toBeUndefined();
      expect(submission.values.customFalsyAttribute).toBe(0);
      expect(submission.values.customFalsyBoolAttribute).toBe(false);
      expect(submission.values.customFalsyStrAttribute).toBe('');
    });

    it('should return translate attribute keys and values if keys mapping is provided', () => {
      class CustomOccurrence extends Occurrence {
        keys = {
          size: {
            id: 'butterfly_size',
            values: {
              huge: 1,
            },
          },
        };
      }
      const occurrence = new CustomOccurrence({
        attrs: {
          size: 'huge',
        },
      });
      const submission = occurrence.getSubmission();
      expect(submission.values.butterfly_size).toBe(1);
    });

    it('should support key value arrays', () => {
      // Given
      class CustomOccurrence extends Occurrence {
        keys = {
          size: {
            id: 'butterfly_size',
            values: [
              {
                value: 'huge',
                id: 1,
              },
            ],
          },
        };
      }
      const occurrence = new CustomOccurrence({
        attrs: { size: 'huge' },
      });
      // When
      const submission = occurrence.getSubmission();
      // Then
      expect(submission.values.butterfly_size).toBe(1);
    });

    it('should support attribute value arrays', () => {
      class CustomOccurrence extends Occurrence {
        keys = {
          colour: {
            id: 'butterfly_colour',
            values: {
              red: 1,
              green: 2,
              black: 3,
            },
          },
        };
      }
      const occurrence = new CustomOccurrence({
        attrs: {
          colour: ['red', 'green'],
        },
      });
      const submission = occurrence.getSubmission();
      expect(submission.values.butterfly_colour).toEqual([1, 2]);
    });
  });
});
