/* eslint-disable no-console */
import 'dotenv/config'
import 'config/db.js'
import Exam from 'api/exams/exams.model'
import Model from 'api/models/models.model'

const path = 'https://dkmwdxc6g4lk7.cloudfront.net/assets/svg'

/**
 * @description
 * Script runs and insert all images based on index.
 */
async function script () {
  try {
    const models = await Model.query().select(['id', 'name'])


    for (const model of models ) {
      const exams = await Exam.query().where({ examModelId:  model.id })

      await Model.query().updateAndFetchById(model.id, {
        logo: `${path}/${model.name.toLowerCase()}.png`
      })

      for (const exam in exams) {
        const index = parseInt(exam) + 1

        await Exam.query().updateAndFetchById(exams[exam].id, {
          alternImageUrl: `${path}/o-${index}.svg`,
          imageUrl: `${path}/${index}.svg`,
          requiresPayment: parseInt(exam) !== 0
        })
      }
    }

  } catch (err) {
    console.error(err)
  }

  process.exit()
}

script()