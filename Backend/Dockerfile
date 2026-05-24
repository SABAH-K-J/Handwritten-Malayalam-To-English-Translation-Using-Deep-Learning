# Use Python 3.10.9-slim
FROM python:3.10.9-slim

# Set working directory
WORKDIR /app

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install system dependencies required for opencv, kenlm, and other libraries
# Clean up apt cache to reduce image size
# Added --fix-missing and --no-install-recommends for more robust builds
RUN apt-get update && apt-get install -y --fix-missing --no-install-recommends \
    build-essential \
    cmake \
    git \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
# Upgrade pip first
# Install PyTorch CPU version separately to save space (approx. 2GB saved)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Change ownership of the app directory to the non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the standard port for Hugging Face Spaces (7860) or fallback to 7860
EXPOSE 7860

# Command to run the application (Uses PORT env var if set, otherwise 7860)
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-7860}
