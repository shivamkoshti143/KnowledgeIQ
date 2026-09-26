#!/bin/bash
set -e

# Ensure MySQL is running
if ! /opt/lampp/lampp status | grep -q "MySQL is running"; then
    echo "Starting MySQL..."
    /opt/lampp/lampp startmysql
fi

# Stop previous instances
pkill -f "router.php" 2>/dev/null || true
pkill -f "server.py" 2>/dev/null || true
sleep 1

# Start PHP backend on 0.0.0.0:4001
nohup /opt/lampp/bin/php -S 0.0.0.0:4001 /opt1/ABM_KnowledgeLQ/php-server/router.php > /opt1/ABM_KnowledgeLQ/php.log 2>&1 &
echo "PHP backend started on 0.0.0.0:4001"

# Start Python HTTP proxy on port 80
cd /opt1/ABM_KnowledgeLQ/dist
nohup python3 server.py > /opt1/ABM_KnowledgeLQ/dist/server.log 2>&1 &
echo "Web server started on port 80"
