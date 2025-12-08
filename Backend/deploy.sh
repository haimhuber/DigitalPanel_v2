#!/bin/bash
echo "🚀 Starting deployment..."
#!/bin/bash
echo "🚀 Starting deployment..."

# ----------------------------
# 1️⃣ Check Node.js installation
# ----------------------------
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing latest LTS..."

    # Use PowerShell to download and install Node.js LTS MSI
    NODE_VERSION="24.3.0"  # Latest LTS version (update if needed)
    NODE_URL="https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-x64.msi"
    DOWNLOAD_PATH="/c/DeployFolder/node-v$NODE_VERSION-x64.msi"

    # Create download folder if it doesn't exist
    mkdir -p /c/DeployFolder

    echo "Downloading Node.js LTS $NODE_VERSION..."
    powershell.exe -Command "Invoke-WebRequest -Uri $NODE_URL -OutFile $DOWNLOAD_PATH"

    echo "Installing Node.js..."
    powershell.exe -Command "Start-Process msiexec.exe -ArgumentList '/i','$DOWNLOAD_PATH','/quiet','/norestart' -Wait"

    echo "✅ Node.js installed."
else
    echo "ℹ️ Node.js is already installed."
fi

# Verify Node.js installation
node -v
npm -v

# ----------------------------
# 2️⃣ Create deployment folder
# ----------------------------
FOLDER_PATH="/c/DeployFolder"
if [ ! -d "$FOLDER_PATH" ]; then
    mkdir -p "$FOLDER_PATH"
    echo "✅ Folder created at $FOLDER_PATH"
else
    echo "ℹ️ Folder already exists at $FOLDER_PATH"
fi

# ----------------------------
# 3️⃣ Clone project repository
# ----------------------------
REPO_URL="https://github.com/haimhuber/finalProject.git"
TARGET_DIR="$FOLDER_PATH/finalProject"

if [ ! -d "$TARGET_DIR" ]; then
    git clone "$REPO_URL" "$TARGET_DIR"
    echo "✅ Repository cloned into $TARGET_DIR"
else
    echo "ℹ️ Repository already exists. Pulling latest changes..."
    cd "$TARGET_DIR" || exit 1
    git pull
fi

# # ----------------------------
# # 4️⃣ Open VS Code
# # ----------------------------
# cd "$TARGET_DIR" || exit 1
# echo "💻 Opening VS Code..."
# code . &

# ----------------------------
# 5️⃣ Install Node.js dependencies
# ----------------------------
echo "📦 Installing Node.js dependencies..."
npm install

echo "🎉 Deployment finished."


# Set folder path on C: drive
FOLDER_PATH="/c/DeployFolder"

# Create folder if it doesn't exist
if [ ! -d "$FOLDER_PATH" ]; then
  mkdir -p "$FOLDER_PATH"
  echo "✅ Folder created at $FOLDER_PATH"
else
  echo "ℹ️ Folder already exists at $FOLDER_PATH"
fi

# Clone project repository into the deploy folder
REPO_URL="https://github.com/haimhuber/finalProject.git"
TARGET_DIR="$FOLDER_PATH/finalProject"

if [ ! -d "$TARGET_DIR" ]; then
  git clone "$REPO_URL" "$TARGET_DIR"
  echo "✅ Repository cloned into $TARGET_DIR"
else
  echo "ℹ️ Repository already exists at $TARGET_DIR, skipping clone."
fi

# Change to project directory
cd "$TARGET_DIR" || exit 1

# # Open VS Code
# echo "💻 Opening VS Code..."
# code .

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

node app.js

echo "🎉 Deployment finished."
