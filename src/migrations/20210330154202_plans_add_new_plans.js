const newPlans = [
  {
    available: true,
    classes: 0,
    currency: 'EUR',
    feature: 'EXAMS',
    modelId: 2,
    name: 'Go',
    price: 900,
    speaking: 0,
    writing: 0
  },
  {
    available: true,
    classes: 0,
    currency: 'EUR',
    feature: 'EXAMS',
    modelId: 2,
    name: 'Silver',
    price: 1200,
    speaking: 0,
    writing: 5
  },
  {
    available: true,
    classes: 0,
    currency: 'EUR',
    feature: 'EXAMS',
    modelId: 2,
    name: 'Gold',
    price: 1500,
    speaking: 5,
    writing: 0
  },
  {
    available: true,
    classes: 0,
    currency: 'EUR',
    feature: 'EXAMS',
    modelId: 2,
    name: 'Platinum',
    price: 2100,
    speaking: 5,
    writing: 5
  },
  {
    available: true,
    classes: 1,
    currency: 'EUR',
    feature: 'EXAMS',
    modelId: 2,
    name: 'Blue',
    price: 1300,
    speaking: 0,
    writing: 0
  },
  {
    available: true,
    classes: 4,
    currency: 'EUR',
    feature: 'EXAMS',
    modelId: 2,
    name: 'Green',
    price: 4900,
    speaking: 0,
    writing: 0
  },
  {
    available: true,
    classes: 0,
    currency: 'EUR',
    feature: 'EXAMS',
    modelId: 2,
    name: 'Ruby',
    price: 3900,
    speaking: 10,
    writing: 10
  }
]

exports.up = function (knex) {
  return knex('plans').insert(newPlans)
}

exports.down = function (knex) {
  return Promise.all(newPlans.map(plan => knex('plans').where(plan).del()))
}
