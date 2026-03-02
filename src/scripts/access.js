/* eslint-disable no-console */
import 'dotenv/config'
import 'config/db.js'
import Access from 'api/access/access.model'
import Plans from 'api/plans/plans.model'
import { Plan } from 'metadata/plans'

const context = ['COURSES', 'CLASSES', 'EVALUATIONS', 'EXAMS']

async function script() {
  const [COURSES, CLASSES, EVALUATION, EXAMS] = context

  const plans = await Plans.query()

  try {
    for (const { name, id } of plans) {
      switch (name) {
        case Plan.APTIS:
          await Access.query().insertAndFetch({
            planId: id,
            feature: COURSES
          })
          break

        case Plan.SILVER:
          await Access.query().insertGraph([
            { planId: id, feature: EXAMS },
            { planId: id, feature: EVALUATION }
          ])
          break

        case Plan.GOLD:
          await Access.query().insertGraph([
            { planId: id, feature: EXAMS },
            { planId: id, feature: EVALUATION }
          ])
          break

        case Plan.GREEN:
          await Access.query().insert({
            planId: id,
            feature: CLASSES
          })
          break

        case Plan.PLATINUM:
          await Access.query().insertGraph([
            { planId: id, feature: EXAMS },
            { planId: id, feature: EVALUATION }
          ])
          break

        case Plan.RUBY:
          await Access.query().insertGraph([
            { planId: id, feature: EXAMS },
            { planId: id, feature: EVALUATION }
          ])
          break

        case Plan.BLUE:
          await Access.query().insert({
            planId: id,
            feature: CLASSES
          })
          break

        case Plan.DIAMOND:
          await Access.query().insertGraph([
            { planId: id, feature: EXAMS },
            { planId: id, feature: EVALUATION },
            { planId: id, feature: COURSES },
            { planId: id, feature: CLASSES }
          ])
          break

        case Plan.GO:
          await Access.query().insert({
            planId: id,
            feature: EXAMS
          })
          break

        case Plan.MASTER:
          await Access.query().insertGraph([
            { planId: id, feature: EXAMS },
            { planId: id, feature: EVALUATION },
            { planId: id, feature: COURSES },
            { planId: id, feature: CLASSES }
          ])
          break

        case Plan.GRANDMASTER:
          await Access.query().insertGraph([
            { planId: id, feature: EXAMS },
            { planId: id, feature: EVALUATION },
            { planId: id, feature: COURSES },
            { planId: id, feature: CLASSES }
          ])
          break
      }
    }
  } catch (err) {
    console.log(err)
  }
}

script().finally(process.exit)
