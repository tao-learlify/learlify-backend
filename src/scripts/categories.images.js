/* eslint-disable no-console */
import 'dotenv/config'
import 'config/db.js'
import Categories from 'api/categories/categories.model'
import Plans from 'api/plans/plans.model'

const pathSVG = 'https://dkmwdxc6g4lk7.cloudfront.net/assets/svg'
const pathPNG = 'https://dkmwdxc6g4lk7.cloudfront.net/assets/img'

async function script () {
  const categories = await Categories.query()

  const plans = await Plans.query()

  for (const { id, name } of categories) {
    await Categories.query().updateAndFetchById(id, {
      name,
      imageUrl: `${pathSVG}/${name}.svg`
    }) 
  }

  for (const { name, id } of plans) {
    await Plans.query().updateAndFetchById(id, {
      pandaUrl: `${pathPNG}/${name.toLowerCase()}.png`
    })
  }

  process.exit()
}

script ()