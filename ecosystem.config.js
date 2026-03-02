module.exports = {
  apps: [
    {
      name: 'aptisgo',
      script: 'npm run build',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
