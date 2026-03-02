import { StatsFunctions } from 'api/stats/stats.functions'
import { Categories } from 'metadata/categories'
import { Models } from 'metadata/models'

it('Should return bandScore', () => {
  /**
   * @description
   * Expecting bandScore to be 0.
   */
  expect(
    StatsFunctions.score({
      model: Models.IELTS,
      category: Categories.Reading,
      value: 25
    }).points
  ).toBe(0)
})

it('Should return a bandScore with teacher feedback', () => {
  const wrapper = {
    model: {
      name: Models.IELTS
    },
    category: {
      name: Categories.Speaking
    }
  }

  expect(
    StatsFunctions.updateWithTeacherScore(
      [
        [9, 9, 9, 9],
        [9, 9, 9, 9],
        [9, 9, 9, 9]
      ],
      wrapper
    )
  ).toStrictEqual({
    bandScore: 9,
    marking: 'A1',
    points: 0
  })
})
