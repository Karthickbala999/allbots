module.exports = {
  apps: [
    {
      name: 'NKG-BOT',
      script: 'index.js',
      cwd: '../NKG BOT',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'MUSIC-BOT',
      script: 'index.js',
      cwd: '../music bot',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'TIMER-BOT',
      script: 'src/index.js',
      cwd: '../timerbot',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      }
    }
  ]
};
