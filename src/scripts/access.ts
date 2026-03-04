import 'dotenv/config'
import 'config/db'
import Access from 'api/access/access.model'
import Plans from 'api/plans/plans.model'
import { Plan } from 'metadata/plans'

type PlanRow = {
  name: string
  id: number
}

type AccessFeatureContext = [string, string, string, string]

const context: AccessFeatureContext = ['COURSES', 'CLASSES', 'EVALUATIONS', 'EXAMS']

async function script(): Promise<void> {
  const printer = globalThis.console
  const [COURSES, CLASSES, EVALUATION, EXAMS] = context

  const plans = (await Plans.query()) as unknown as PlanRow[]

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
  } catch (err: unknown) {
    printer.log(err)
  }
}

script().finally(process.exit)
