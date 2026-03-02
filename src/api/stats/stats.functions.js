import { Models } from 'metadata/models'
import { Categories } from 'metadata/categories'
import { sum } from 'functions'

const A1 = 'A1'
const A2 = 'A2'
const B1 = 'B1'
const B2 = 'B2'
const C1 = 'C1'

const score = {
  [Models.APTIS]: {
    [Categories.Core]: {
      points: 1,
      ranges: [
        [45, 55, C1],
        [35, 44, B2],
        [25, 34, B1],
        [10, 24, A2],
        [0, 9, A1]
      ]
    },
    [Categories.Reading]: {
      points: 1.7,
      ranges: [
        [45, 55, C1],
        [35, 44, B2],
        [25, 34, B1],
        [15, 24, A2],
        [0, 14, A1]
      ]
    },
    [Categories.Listening]: {
      points: 2,
      ranges: [
        [45, 55, C1],
        [35, 44, B2],
        [25, 34, B1],
        [10, 24, A2],
        [0, 9, A1]
      ]
    },
    [Categories.Speaking]: {
      score: [
        [
          [0, 0.3, 0.6, 1],
          [0, 0.3, 0.6, 1],
          [0, 0.6, 1.2, 2]
        ],
        [
          [0, 0.6, 1.2, 2],
          [0, 0.6, 1.2, 2],
          [0, 0.6, 1.2, 2]
        ],
        [
          [0, 1, 2, 3],
          [0, 0.6, 1.2, 2],
          [0, 0.6, 1.2, 2]
        ],
        [
          [0, 1, 2, 3],
          [0, 1, 2, 3],
          [0, 0.6, 1.2, 2]
        ]
      ],
      ranges: [
        [45, 55, C1],
        [40, 44, B2],
        [25, 39, B1],
        [15, 24, A2],
        [0, 14, A1]
      ]
    },
    [Categories.Writing]: {
      score: [
        [0, 0.2, 0.4, 0.6],
        [0, 1, 2, 4],
        [0, 0.5, 1, 2],
        [0, 2, 4, 6]
      ],
      ranges: [
        [45, 55, C1],
        [35, 44, B2],
        [25, 34, B1],
        [15, 24, A2],
        [0, 14, A1]
      ]
    }
  },
  [Models.IELTS]: {
    [Categories.Listening]: {
      points: 1,
      ranges: [
        [40, 39, 9],
        [38, 37, 8.5],
        [36, 35, 8],
        [34, 32, 7.5],
        [31, 30, 7],
        [29, 26, 6.5],
        [25, 23, 6],
        [22, 18, 5.5],
        [17, 16, 5],
        [15, 13, 4.5],
        [12, 11, 4],
        [10, 8, 3.5],
        [7, 5, 3],
        [4, 1, 2.5]
      ]
    },
    [Categories.Reading]: {
      ranges: [
        [40, 39, 9],
        [38, 37, 8.5],
        [36, 35, 8],
        [34, 33, 7.5],
        [32, 30, 7],
        [29, 27, 6.5],
        [26, 23, 6],
        [22, 19, 5.5],
        [18, 15, 5],
        [14, 13, 4.5],
        [12, 10, 4],
        [9, 8, 3.5],
        [7, 6, 3],
        [5, 4, 2.5]
      ],
      points: 1
    }
  }
}

class StatsFunctions {
  /**
   * @typedef {Object} Score
   * @property {number} value
   * @property {string} model
   * @property {string} category
   *
   * @param {Score} context
   */
  static score(context, forStats) {
    if (context.model === Models.APTIS) {
      /**
       * @description
       * Getting the current properties for scoring.
       */
      const ref = score[context.model][context.category]

      const points = forStats
        ? context.value
        : Math.round(context.value * ref.points)

      const marking = ref.ranges.find(
        ([min, max]) => max >= points && min <= points
      )

      return {
        bandScore: 0,
        marking: marking ? marking[2] : A1,
        points: points ? points : 0
      }
    }

    if (context.model === Models.IELTS) {
      const ref = score[context.model][context.category]

      const bandScore = ref.ranges.find(
        ([max, min]) => max >= context.value && min <= context.value
      )

      return {
        bandScore: bandScore ? bandScore[2] : 0,
        points: context.value ? context.value : 0,
        marking: A1
      }
    }
  }

  /**
   * @param {[]} results
   * @param {string} model
   * @param {string} context
   */
  static getAverageSkills(skills, model, context) {
    function range(value, marking) {
      return marking.filter(([min, max]) => {
        return max >= value && min <= value
      })
    }

    if (model === Models.APTIS) {
      const data = score[model][context]

      const dataset = range(skills, data.ranges).flat()

      return dataset[2]
    }
  }

  /**
   * Get the avg chart index.
   * @param {strng} model
   * @param {string} category
   */
  static getDataScore(model, points = 0, category) {
    const labels = StatsFunctions.getLabels(model)

    if (model.name === Models.APTIS) {
      const { marking } = StatsFunctions.score({
        category: category,
        model: model.name,
        value: points
      })

      const label = Object.keys(labels).find(label => labels[label] === marking)

      return label
    }

    if (model.name === Models.IELTS) {
      const label = Math.round(points).toString()

      if (isNaN(label)) {
        return '0'
      }

      return label
    }
  }

  /**
   * Get the labels for graphics charts.
   * @param {string} model
   */
  static getLabels(model) {
    switch (model.name) {
      case Models.APTIS:
        return {
          8: 'C1',
          6: 'B2',
          4: 'B1',
          2: 'A2',
          0: 'A1'
        }

      case Models.IELTS:
        return {
          9: '9',
          8: '8',
          7: '7',
          6: '6',
          5: '5',
          4: '4',
          3: '3',
          2: '2',
          1: '1',
          0: 'N/A'
        }
    }
  }

  /**
   * [[], [], [], []]
   * @param {number [][]} data
   * @param {{ model: { name: string }, category: { name: string }}}
   */
  static updateWithTeacherScore(data, { model, category }) {
    if (model.name === Models.APTIS) {
      if (
        category.name === Categories.Writing ||
        category.name === Categories.Speaking
      ) {
        /**
         * @description
         * We should have a array of array of numbers.
         * Then we should calculate our input that is "data"
         * @example
         * updatwWithTeacherScore([[0, 0, 0], [0, 0, 0], [0, 0, 1]]) => this will get our vale.
         * @type {number}
         */

        /**
         * @description
         * When writing is being evaluated only will be allocated based on index
         * Meanwhile Speaking have multiples values of array.
         */
        const flatScore = data
          .map((scores, index) =>
            scores
              .map((current, subIndex) => {
                return category.name === Categories.Writing
                  ? score[Models.APTIS][category.name].score[index][current]
                  : score[Models.APTIS][category.name].score[index][subIndex][current]
              })
              .reduce(sum, 0)
          )
          .reduce(sum, 0)

        /**
         * @description
         * Getting the current output score.
         */
        return StatsFunctions.score(
          {
            model: model.name,
            category: category.name,
            value: Math.ceil(flatScore * 2)
          },
          true
        )
      }
    }

    /**
     * @description
     * BandScore output.
     */
    if (model.name === Models.IELTS) {
      const initial = 0
      /**
       * @description
       * First of all, we need to first reduce all input data.
       * @type {number}
       */
      const bandScore = data.reduce((accumulator, localScore) => {
        const avg =
          localScore.reduce((total, input) => total + input, initial) /
          localScore.length

        return accumulator + avg
      }, initial)

      return {
        bandScore: bandScore / data.length,
        marking: A1,
        points: 0
      }
    }
  }

  /**
   * @param {number} _
   * @param {number} index
   */
  static transformIdToIndex(id, index) {
    return index + 1
  }
}

export { StatsFunctions }
