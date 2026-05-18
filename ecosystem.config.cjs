module.exports = {
  apps: [
    {
      name: 'pb-worker',
      script: 'npx',
      args: 'tsx lib/worker/index.ts',
      cwd: '/root/pulsbooster',
      autorestart: true,
      watch: false,
      max_memory_restart: '900M',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
