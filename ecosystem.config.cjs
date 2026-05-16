module.exports = {
  apps: [
    {
      name: "kowloon-frontend",
      script: "npm",
      args: "run dev",
      interpreter: "none",
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "500M",
      time: true,
    },
  ],
};
