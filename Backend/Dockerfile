# BACKEND/Dockerfile

# 1. Use Python 3.10 Slim
FROM python:3.10-slim

# 2. Set working directory
WORKDIR /app

# 3. Increase Timeout to prevent network errors
ENV PIP_DEFAULT_TIMEOUT=1000

# 4. Install system dependencies (Fixed package names)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 5. Upgrade pip first
RUN pip install --upgrade pip

# 6. CRITICAL FIX: Install CPU-only PyTorch (Small & Fast)
#    This prevents downloading the 1.5GB Nvidia CUDA files
RUN pip install torch torchvision

# 7. Copy requirements and install the rest
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 8. Copy application code
COPY . .

# 9. Expose port
EXPOSE 8000

# 10. Start Server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]