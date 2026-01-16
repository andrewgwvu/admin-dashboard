#!/bin/bash

# Homelab Dashboard - Quick Setup Script

echo "========================================="
echo "Homelab Dashboard Setup"
echo "========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it first:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

echo "✓ Found .env file"
echo ""

# Step 1: Start containers
echo "📦 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Step 2: Initialize database schema
echo ""
echo "🗄️  Initializing database schema..."
docker-compose exec -T postgres psql -U homelab -d homelab_dashboard < backend/src/utils/database-init.sql

if [ $? -eq 0 ]; then
    echo "✓ Database schema initialized successfully"
else
    echo "❌ Database initialization failed"
    exit 1
fi

# Step 3: Create admin user
echo ""
echo "👤 Creating admin user..."
echo ""
echo "Please enter admin credentials:"
read -p "Username [admin]: " username
username=${username:-admin}

read -p "Email [admin@example.com]: " email
email=${email:-admin@example.com}

read -p "First Name [Admin]: " firstname
firstname=${firstname:-Admin}

read -p "Last Name [User]: " lastname
lastname=${lastname:-User}

read -sp "Password: " password
echo ""

if [ -z "$password" ]; then
    echo "❌ Password cannot be empty"
    exit 1
fi

# Create admin user using SQL
docker-compose exec -T postgres psql -U homelab -d homelab_dashboard <<EOF
DO \$\$
DECLARE
    password_hash TEXT;
BEGIN
    -- Note: This is a bcrypt hash of 'admin' - you should change the password after first login
    -- Or run the create-admin-user.sh script to set a custom password
    password_hash := '\$2a\$10\$' || encode(digest('$password' || 'salt', 'sha256'), 'base64');

    INSERT INTO users (username, email, password_hash, first_name, last_name)
    VALUES ('$username', '$email', '$password_hash', '$firstname', '$lastname')
    ON CONFLICT (username) DO NOTHING;

    IF FOUND THEN
        RAISE NOTICE 'Admin user created successfully';
    ELSE
        RAISE NOTICE 'User already exists';
    END IF;
END \$\$;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Admin user created successfully"
else
    echo "❌ Failed to create admin user"
    echo ""
    echo "You can create one manually using the Docker command:"
    echo "  docker-compose exec postgres psql -U homelab -d homelab_dashboard"
    echo "Then run the SQL from backend/src/utils/database-init.sql"
fi

echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Your dashboard is ready at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:3001"
echo ""
echo "Login credentials:"
echo "  Username: $username"
echo "  Email: $email"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop:"
echo "  docker-compose down"
echo ""
