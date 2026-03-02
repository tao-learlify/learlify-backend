exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('users')
    .del()
    .then(() => {
      return knex('roles')
        .del()
        .then(() => {
          return knex('roles')
            .insert([
              { id: 1, name: 'Admin' },
              { id: 2, name: 'Teacher' },
              { id: 3, name: 'User' }
            ])
            .then(() => {
              return knex('users').insert([
                {
                  id: 1,
                  email: 'taoaleixandre@gmail.com',
                  password:
                    '$2y$10$SfjjyZEgpRRcFOnYDRkedeX3FNCP9yBBkABrHyvWAvslf6iyIK1oi',
                  firstName: 'Tao',
                  lastName: 'Aptis',
                  roleId: 1,
                  isVerified: true
                }
              ])
            })
        })
    })
}
