FROM python:3.12-slim

WORKDIR /app

# gcc + libffi are needed to compile cryptography / bcrypt wheels on slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies before copying source (maximises layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source (overridden by the volume mount in docker-compose)
COPY . .

EXPOSE 8000

CMD ["python", "main.py"]
