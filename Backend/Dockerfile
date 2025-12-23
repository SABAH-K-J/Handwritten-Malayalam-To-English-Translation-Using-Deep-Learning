FROM python:3.10-slim

WORKDIR /app

# --- ADD THIS BLOCK ---
# Install build tools required for kenlm and other libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    zlib1g-dev \
    libboost-all-dev \
    && rm -rf /var/lib/apt/lists/*
# ----------------------

RUN pip install --upgrade pip

# Install massive libraries (cached layer)
RUN pip install torch torchvision

COPY requirements.txt .

# Now this will succeed because we have cmake and g++
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app"]