module.exports = {
  apps: [
    {
      name: 'dos-platform',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3010,
      },
      max_memory_restart: '512M',
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 30000,
      kill_timeout: 5000,
      wait_ready: true,
      shutdown_with_message: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
