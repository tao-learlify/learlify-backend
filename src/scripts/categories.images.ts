import 'dotenv/config'
import 'config/db'
import Categories from 'api/categories/categories.model'
import Plans from 'api/plans/plans.model'

type CategoryRow = {
  id: number
  name: string
}

type PlanRow = {
  id: number
  name: string
}

const pathSVG = 'https://dkmwdxc6g4lk7.cloudfront.net/assets/svg'
const pathPNG = 'https://dkmwdxc6g4lk7.cloudfront.net/assets/img'

async function script(): Promise<void> {
  const categories = (await Categories.query()) as unknown as CategoryRow[]

  const plans = (await Plans.query()) as unknown as PlanRow[]

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

script()
