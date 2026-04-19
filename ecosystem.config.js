// Unified PM2 topology for the Dogan AI OS.
// - dogan-os      : Fastify composer (DOS + DAuth + DSOC + DNOC pillars)   :3100
// - dos-platform  : Express platform-package (admin UI BFF, NOC+SOC console):3010
// Both share the same PostgreSQL and therefore the same
// platform.security_alerts and platform.audit_log tables, which is what
// keeps the NOC+SOC console in sync with live pillar writes.
module.exports = {
  apps: [
    {
      name: 'dogan-os',
      cwd: '/root/Ai-Consult-Microservices',
      // Source runtime kernel env (DATABASE_URL, NATS_*, KERNEL_*) from the
      // secrets-managed runtime file before exec-ing the composer.
      script: '/usr/bin/bash',
      args: '-c "set -a; . /etc/dogan-ai-os/kernel.env; set +a; exec node --enable-source-maps src/composer/dist/index.js"',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/root/.pm2/logs/dogan-os-error.log',
      out_file: '/root/.pm2/logs/dogan-os-out.log',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 20,
      restart_delay: 5000,
      kill_timeout: 10000,
    },
    {
      name: 'dos-platform',
      cwd: '/root/Ai-Consult-Microservices/platform-package',
      script: 'backend/dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
        PLATFORM_NAME: 'dos-platform',
        PLATFORM_VERSION: '1.5.0',
        PLATFORM_DOMAIN: 'dogan-ai.com',
        DEPLOYMENT_MODE: 'standalone',
        // Pillars BFF hits these external pillar data planes
        PROMETHEUS_URL: 'http://127.0.0.1:9090',
        ALERTMANAGER_URL: 'http://127.0.0.1:9093',
        COMPOSER_URL: 'http://127.0.0.1:3100',
      },
      error_file: '/root/Ai-Consult-Microservices/platform-package/logs/dos-platform-error.log',
      out_file: '/root/Ai-Consult-Microservices/platform-package/logs/dos-platform-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 10000,
      listen_timeout: 30000,
      shutdown_with_message: true,
      wait_ready: false,
    },
  ],
};
