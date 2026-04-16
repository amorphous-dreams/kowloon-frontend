#!/bin/sh
# Inject runtime config into config.js.
# API_URL is only needed when the frontend runs on a different origin than the
# API server. When they share a domain via Caddy, leave API_URL unset and the
# frontend resolves the API from window.location.origin automatically.
cat > /usr/share/nginx/html/config.js << EOF
window.KOWLOON_CONFIG = {
  apiUrl: "${API_URL:-}"
};
EOF
exec nginx -g 'daemon off;'
