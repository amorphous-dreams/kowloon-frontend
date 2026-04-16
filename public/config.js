// Runtime config — overwritten by the Docker entrypoint when API_URL is set.
// When running via docker-compose with Caddy routing, API_URL is not needed
// because the frontend and API share the same origin.
window.KOWLOON_CONFIG = window.KOWLOON_CONFIG || {};
