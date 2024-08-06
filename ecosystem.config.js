module.exports = {
  apps: [{
    name: "server_pleer",
    script: "server.js",
    env: {
      NODE_ENV: "production",
    },
    pre_start: "npm run build"
  }]
}
